'use server';

import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import {
  createOrAttachSelfServiceBusiness,
  triggerSelfServiceScan,
} from '@/lib/build/start-self-service-build';
import { SelfServiceBuildCreateInputSchema } from '@/lib/build/schema';
import { updateBusiness } from '@/lib/db/businesses';
import { buildSelfServiceBuildRateLimitKey, checkAndIncrementSelfServiceBuildRateLimit } from '@/lib/db/claims';
import { appendBusinessPhotos, uploadBusinessAsset } from '@/lib/s3/business-assets';
import { UploadValidationError } from '@/lib/s3/upload-validation';
import { signBuildSession, BUILD_SESSION_COOKIE_NAME, BUILD_SESSION_MAX_AGE_SECONDS } from '@/lib/auth/build-session';
import { hashIp } from '@/lib/claim/validate-token';
import {
  HONEYPOT_FIELD_NAME,
  FORM_RENDERED_AT_FIELD_NAME,
  isHoneypotTripped,
  isSubmittedTooFast,
} from '@/lib/leads/spam-guard';

/** Matches `MAX_BUSINESS_PHOTOS` (`lib/customer-editing/photos.ts`) and `SelfServiceBuildInputSchema`'s own `photoUrls` cap. */
const MAX_PHOTOS = 6;

/**
 * A daily (not 10-minute, like leads') window — building a website is a
 * far heavier and rarer action than submitting a contact form, so a much
 * lower per-IP ceiling over a much longer window is the right shape here.
 */
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_TTL_BUFFER_MS = RATE_LIMIT_WINDOW_MS * 2;
const PER_IP_RATE_LIMIT = 3;

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const RATE_LIMITED_ERROR = 'Too many attempts from this connection. Please try again tomorrow.';

export type BuildFormState = { error?: string } | undefined;

async function resolveIpHash(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return hashIp(ip);
}

function textField(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function fieldsFromFormData(formData: FormData) {
  const line1 = textField(formData, 'addressLine1');
  const city = textField(formData, 'addressCity');
  const state = textField(formData, 'addressState');
  const postalCode = textField(formData, 'addressPostalCode');

  const socialLinks = ['facebook', 'instagram', 'linkedin', 'youtube', 'twitter']
    .map((key) => textField(formData, `social_${key}`))
    .filter((v): v is string => v !== undefined);

  return {
    name: textField(formData, 'name') ?? '',
    industry: textField(formData, 'industry') ?? '',
    phone: textField(formData, 'phone'),
    email: textField(formData, 'email'),
    ...(line1 && city && state && postalCode ? { address: { line1, city, state, postalCode } } : {}),
    hasExistingWebsite: formData.get('hasExistingWebsite') === 'true',
    websiteUrl: textField(formData, 'websiteUrl'),
    servicesOffered: textField(formData, 'servicesOffered'),
    serviceAreas: textField(formData, 'serviceAreas'),
    description: textField(formData, 'description'),
    differentiators: textField(formData, 'differentiators'),
    ...(socialLinks.length > 0 ? { socialLinks } : {}),
  };
}

/** Friendlier than the admin-facing conflict message from `startScanWorkflow`. */
function friendlyErrorMessage(message: string): string {
  if (message.includes('already queued or running')) {
    return 'A build for this business is already in progress.';
  }
  return message;
}

export async function submitBuildAction(_prevState: BuildFormState, formData: FormData): Promise<BuildFormState> {
  const honeypot = String(formData.get(HONEYPOT_FIELD_NAME) ?? '');
  const renderedAtRaw = String(formData.get(FORM_RENDERED_AT_FIELD_NAME) ?? '');

  // Unlike the lead form's silent-success posture, a bot/rejected submission
  // here can't be given a fake "success" — there's no page for it to land
  // on that would look like real progress without an actual build behind
  // it, since this action's own redirect is what creates that page. A
  // generic error (indistinguishable from any other rejection) is the
  // closest equivalent that still fits this flow's shape.
  if (isHoneypotTripped(honeypot) || isSubmittedTooFast(renderedAtRaw)) {
    return { error: GENERIC_ERROR };
  }

  const ipHash = await resolveIpHash();
  const windowBucket = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS).toString();
  const rateLimitTtlEpochSeconds = Math.floor((Date.now() + RATE_LIMIT_TTL_BUFFER_MS) / 1000);
  const withinIpLimit = await checkAndIncrementSelfServiceBuildRateLimit({
    bucketKey: buildSelfServiceBuildRateLimitKey(`self_service_build#ip#${ipHash}`, windowBucket),
    limit: PER_IP_RATE_LIMIT,
    ttlEpochSeconds: rateLimitTtlEpochSeconds,
  });
  if (!withinIpLimit) {
    return { error: RATE_LIMITED_ERROR };
  }

  const parsed = SelfServiceBuildCreateInputSchema.safeParse(fieldsFromFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the highlighted fields.' };
  }

  const created = await createOrAttachSelfServiceBusiness(parsed.data);
  if (created.status === 'blocked') {
    return { error: created.message };
  }

  const { businessId } = created;

  // Uploads happen now, with a real businessId, before the scan workflow
  // starts generating a preview from Business.photoUrls — see
  // start-self-service-build.ts's doc comment for why this can't happen
  // inside createOrAttachSelfServiceBusiness itself.
  try {
    const logoFile = formData.get('logo');
    const photoFiles = formData.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);

    let logoUrl: string | undefined;
    if (logoFile instanceof File && logoFile.size > 0) {
      logoUrl = await uploadBusinessAsset(businessId, logoFile, 'logo');
    }

    let photoUrls: string[] | undefined;
    if (photoFiles.length > 0) {
      photoUrls = await appendBusinessPhotos(businessId, [], photoFiles.slice(0, MAX_PHOTOS));
    }

    if (logoUrl !== undefined || photoUrls !== undefined) {
      await updateBusiness(businessId, {
        ...(logoUrl !== undefined && { logoUrl }),
        ...(photoUrls !== undefined && { photoUrls }),
      });
    }
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return { error: err.message };
    }
    return { error: 'Something went wrong uploading your photos. Please try again.' };
  }

  const triggered = await triggerSelfServiceScan(businessId);
  if (triggered.status !== 'started') {
    return { error: friendlyErrorMessage(triggered.message) };
  }

  const token = await signBuildSession({ businessId, buildId: triggered.scanExecutionId });
  const cookieStore = await cookies();
  cookieStore.set(BUILD_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: BUILD_SESSION_MAX_AGE_SECONDS,
    path: '/',
  });

  redirect(`/build/${triggered.scanExecutionId}`);
}
