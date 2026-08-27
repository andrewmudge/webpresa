'use server';

import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { startSelfServiceBuild } from '@/lib/build/start-self-service-build';
import { SelfServiceBuildInputSchema } from '@/lib/build/schema';
import { buildSelfServiceBuildRateLimitKey, checkAndIncrementSelfServiceBuildRateLimit } from '@/lib/db/claims';
import { signBuildSession, BUILD_SESSION_COOKIE_NAME, BUILD_SESSION_MAX_AGE_SECONDS } from '@/lib/auth/build-session';
import { hashIp } from '@/lib/claim/validate-token';
import { resolveRuntimeEnvironment } from '@/lib/env/runtime-environment';
import {
  HONEYPOT_FIELD_NAME,
  FORM_RENDERED_AT_FIELD_NAME,
  isHoneypotTripped,
  isSubmittedTooFast,
} from '@/lib/leads/spam-guard';

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

/**
 * `logo`/`photos` are no longer raw `File`s by the time this runs — they're
 * uploaded individually, on selection, by `/api/build/upload` (bundling
 * every file into this one final submission hit Vercel's platform-level
 * ~4.5MB serverless request-body ceiling; see that route's doc comment).
 * The wizard instead submits the already-uploaded `/api/assets/...` URLs as
 * plain hidden-input text, which `SelfServiceBuildInputSchema`'s
 * `logoUrl`/`photoUrls` fields already accept.
 */
function fieldsFromFormData(formData: FormData) {
  const line1 = textField(formData, 'addressLine1');
  const city = textField(formData, 'addressCity');
  const state = textField(formData, 'addressState');
  const postalCode = textField(formData, 'addressPostalCode');

  const socialLinks = ['facebook', 'instagram', 'linkedin', 'youtube', 'twitter']
    .map((key) => textField(formData, `social_${key}`))
    .filter((v): v is string => v !== undefined);

  const photoUrls = formData.getAll('photoUrls').filter((v): v is string => typeof v === 'string' && v.trim() !== '');

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
    logoUrl: textField(formData, 'logoUrl'),
    ...(photoUrls.length > 0 ? { photoUrls } : {}),
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

  // Enforced in production only — every non-production environment (dev,
  // Preview deployments, local) is exempt so testing isn't throttled by the
  // same abuse control real traffic needs. `resolveRuntimeEnvironment()`
  // reads Vercel's own `VERCEL_ENV` (falling back to `NODE_ENV`), not a bare
  // `NODE_ENV` check — Vercel sets `NODE_ENV=production` for every deployed
  // build, Preview included, so `NODE_ENV` alone can't distinguish them.
  if (resolveRuntimeEnvironment() === 'production') {
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
  }

  const parsed = SelfServiceBuildInputSchema.safeParse(fieldsFromFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the highlighted fields.' };
  }

  const result = await startSelfServiceBuild(parsed.data);
  if (result.status !== 'started') {
    return { error: result.status === 'blocked' ? result.message : friendlyErrorMessage(result.message ?? GENERIC_ERROR) };
  }

  const token = await signBuildSession({ businessId: result.businessId, buildId: result.scanExecutionId });
  const cookieStore = await cookies();
  cookieStore.set(BUILD_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: BUILD_SESSION_MAX_AGE_SECONDS,
    path: '/',
  });

  redirect(`/build/${result.scanExecutionId}`);
}
