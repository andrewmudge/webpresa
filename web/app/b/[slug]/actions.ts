'use server';
import { headers } from 'next/headers';
import { hashIp } from '@/lib/claim/validate-token';
import { getBusinessBySlug } from '@/lib/db/businesses';
import { getPreviewsBySlug } from '@/lib/db/site-previews';
import { computeBusinessAccessMode, hasPlanCapability } from '@/lib/auth/customer-authorization';
import { isValidEmail } from './template/tokens';
import {
  HONEYPOT_FIELD_NAME,
  FORM_RENDERED_AT_FIELD_NAME,
  isHoneypotTripped,
  isSubmittedTooFast,
  computeLeadFingerprint,
} from '@/lib/leads/spam-guard';
import { buildLeadRateLimitKey, checkAndIncrementLeadRateLimit, putLead, reserveLeadFingerprint } from '@/lib/db/leads';
import { createLead } from '@/domain/factories/lead.factory';
import { sendLeadNotificationAndRecordOutcome } from '@/lib/leads/notify';

/**
 * The public "Request Service" form's submission handler — the first
 * mutation originating from `/b/[slug]` (Stage 20). Follows Stage 17's
 * `app/claim/actions.ts`/`submitClaimTokenAction` precedent: a Server
 * Action bound directly to `useActionState`, this repo's only existing
 * pattern for "public, unauthenticated visitor submits a form".
 *
 * Every non-field-validation outcome (rate-limited, plan-gated, duplicate,
 * honeypot/timing-tripped, unknown business) collapses to the same generic
 * `{ status: 'success' }` — never distinguishable from a real acceptance,
 * matching Stage 17's `validateClaimToken` posture of never surfacing which
 * internal check, if any, rejected a submission.
 */

export type SubmitLeadState = { status: 'idle' } | { status: 'error'; error: string } | { status: 'success' };

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_TTL_BUFFER_MS = RATE_LIMIT_WINDOW_MS * 2;
const PER_IP_RATE_LIMIT = 5;
const PER_BUSINESS_RATE_LIMIT = 30;
const FINGERPRINT_WINDOW_MS = 30 * 60 * 1000;

const GENERIC_ERROR = 'Something went wrong. Please try again.';

async function resolveIpHash(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return hashIp(ip);
}

export async function submitLeadAction(_prevState: SubmitLeadState, formData: FormData): Promise<SubmitLeadState> {
  const slug = String(formData.get('slug') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const serviceNeeded = String(formData.get('serviceNeeded') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const honeypot = String(formData.get(HONEYPOT_FIELD_NAME) ?? '');
  const renderedAtRaw = String(formData.get(FORM_RENDERED_AT_FIELD_NAME) ?? '');

  if (!slug) return { status: 'error', error: GENERIC_ERROR };

  // TURNSTILE EXTENSION POINT: verify a 'cf-turnstile-response' field here,
  // before field validation below, once TURNSTILE_SECRET_KEY exists — see
  // web/docs/architecture.md, "Contact Forms and Lead Delivery". Deferred
  // for this stage; no such secret exists anywhere in this repo today.

  // Honeypot + timing — silent rejection, never a distinguishable response.
  if (isHoneypotTripped(honeypot) || isSubmittedTooFast(renderedAtRaw)) {
    return { status: 'success' };
  }

  // Field validation — real, visitor-correctable errors.
  if (!name) return { status: 'error', error: 'Please enter your name.' };
  if (!phone && !email) {
    return { status: 'error', error: 'Please enter a phone number or email so we can reach you.' };
  }
  if (email && !isValidEmail(email)) {
    return { status: 'error', error: 'Please enter a valid email address.' };
  }

  // Resolve the business fresh from the trusted slug — never trust a
  // client-supplied businessId/previewId for anything beyond a display hint.
  const business = await getBusinessBySlug(slug);
  if (!business) return { status: 'success' }; // never confirm/deny slug existence to an anonymous caller

  const ipHash = await resolveIpHash();
  const windowBucket = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS).toString();
  const rateLimitTtlEpochSeconds = Math.floor((Date.now() + RATE_LIMIT_TTL_BUFFER_MS) / 1000);

  const ipRateLimitKey = buildLeadRateLimitKey(`ip#${ipHash}`, windowBucket);
  const withinIpLimit = await checkAndIncrementLeadRateLimit({
    bucketKey: ipRateLimitKey,
    limit: PER_IP_RATE_LIMIT,
    ttlEpochSeconds: rateLimitTtlEpochSeconds,
  });
  if (!withinIpLimit) return { status: 'success' };

  const businessRateLimitKey = buildLeadRateLimitKey(`biz#${business.businessId}`, windowBucket);
  const withinBusinessLimit = await checkAndIncrementLeadRateLimit({
    bucketKey: businessRateLimitKey,
    limit: PER_BUSINESS_RATE_LIMIT,
    ttlEpochSeconds: rateLimitTtlEpochSeconds,
  });
  if (!withinBusinessLimit) return { status: 'success' };

  // Plan-capability re-check — independent of whatever the client rendered.
  if (!hasPlanCapability(computeBusinessAccessMode(business), 'lead_capture')) {
    return { status: 'success' };
  }

  // Duplicate-submission suppression — atomic fingerprint reservation.
  const fingerprint = computeLeadFingerprint({
    businessId: business.businessId,
    name,
    phone: phone || undefined,
    email: email || undefined,
  });
  const fingerprintTtlEpochSeconds = Math.floor((Date.now() + FINGERPRINT_WINDOW_MS) / 1000);
  const reserved = await reserveLeadFingerprint(fingerprint, fingerprintTtlEpochSeconds);
  if (!reserved) return { status: 'success' };

  // The currently published preview, for the audit-only previewId field.
  const previews = await getPreviewsBySlug(slug);
  const previewId = previews.find((p) => p.status === 'published')?.previewId;

  // Persist — must complete before any response.
  const lead = createLead({
    businessId: business.businessId,
    previewId,
    name,
    phone: phone || undefined,
    email: email || undefined,
    serviceNeeded: serviceNeeded || undefined,
    message: message || undefined,
    submitterIpHash: ipHash,
    fingerprint,
  });
  await putLead(lead);

  // The bounded SES attempt never risks the already-durable lead above —
  // failures are recorded on the lead itself, never thrown back to the
  // visitor. A scheduled retry sweep (lib/leads/notify.ts's other callers)
  // picks up anything still pending/failed.
  await sendLeadNotificationAndRecordOutcome(lead, business);

  return { status: 'success' };
}
