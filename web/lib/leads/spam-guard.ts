import { createHash } from 'crypto';

/**
 * Pure, DB-free helpers for the lead-submission spam/abuse pipeline
 * (`web/app/b/[slug]/actions.ts`, `submitLeadAction`). Kept separate from
 * the DynamoDB-backed rate-limit/fingerprint-reservation calls
 * (`lib/db/leads.ts`) so these are unit-testable without mocking AWS.
 *
 * Every check here fails *silently* from the caller's point of view — the
 * public response never distinguishes "spam detected" from "success",
 * matching Stage 17's `validateClaimToken` posture of never surfacing which
 * internal check, if any, rejected a submission.
 */

/** The honeypot field name — deliberately generic/bot-bait, not literally "honeypot". */
export const HONEYPOT_FIELD_NAME = 'website';

/** The hidden mount-timestamp field name, set client-side when the form renders. */
export const FORM_RENDERED_AT_FIELD_NAME = 'renderedAt';

/** Minimum time between form render and submission — catches instant, headless-script submits. */
export const MIN_FORM_FILL_MS = 1500;

/** Non-empty honeypot input means a bot filled in every field, including the one real visitors never see. */
export function isHoneypotTripped(honeypotValue: string): boolean {
  return honeypotValue.trim().length > 0;
}

/**
 * `renderedAt` is a client-set `Date.now()` string; anything missing,
 * malformed, or non-positive is treated as a bot — `Number('')` coerces to
 * `0`, not `NaN`, which would otherwise silently bypass this entire check
 * for a raw POST that omits the field.
 */
export function isSubmittedTooFast(renderedAtRaw: string, now: number = Date.now()): boolean {
  const renderedAt = Number(renderedAtRaw);
  if (!renderedAtRaw || !Number.isFinite(renderedAt) || renderedAt <= 0) return true;
  return now - renderedAt < MIN_FORM_FILL_MS;
}

/**
 * Duplicate-submission signature: same business, same person (by normalized
 * name + whichever contact method was supplied), within one reservation
 * window (see `reserveLeadFingerprint`, `lib/db/leads.ts`). Hex-encoded
 * SHA-256 — matches `LeadSchema.fingerprint`'s shape.
 */
export function computeLeadFingerprint(params: {
  businessId: string;
  name: string;
  phone?: string;
  email?: string;
}): string {
  const normalizedContact = (params.email ?? params.phone ?? '').trim().toLowerCase();
  const normalizedName = params.name.trim().toLowerCase();
  return createHash('sha256').update(`${params.businessId}|${normalizedContact}|${normalizedName}`).digest('hex');
}
