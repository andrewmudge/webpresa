import 'server-only';
import { createHash } from 'crypto';
import { getClaimByTokenHashWithLazyExpiry, checkAndIncrementRateLimit, buildRateLimitKey } from '@/lib/db/claims';
import { getBusinessById } from '@/lib/db/businesses';
import { normalizeClaimToken, hashClaimToken } from './token';

/**
 * Shared validation logic for both claim entrypoints (`GET
 * /claim/[claimToken]` and the `POST /claim` manual-entry form) — the two
 * Next.js-specific callers differ only in how they set the claim-attempt
 * cookie (a Route Handler's `NextResponse` vs. a Server Action's
 * `next/headers` `cookies()`), so the actual lookup/rate-limit/state logic
 * lives here once.
 *
 * Every non-`valid` outcome (not found, expired, revoked, consumed by
 * someone else, or rate-limited) renders identically to the caller — never
 * distinguished, per implementation.md, Stage 17, "Security requirements".
 */

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;
/** Counter items are cleaned up well after their window closes — TTL is cleanup only, not the enforcement mechanism. */
const RATE_LIMIT_TTL_BUFFER_MS = RATE_LIMIT_WINDOW_MS * 2;

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

export type ValidateClaimTokenResult =
  | { outcome: 'invalid' }
  | { outcome: 'valid'; claimId: string; businessId: string; businessName: string }
  /** The visitor's current customer session already consumed this exact claim — idempotent resume. */
  | { outcome: 'resume'; businessId: string };

export async function validateClaimToken(params: {
  rawToken: string;
  ipHash: string;
  currentSessionUserId?: string;
}): Promise<ValidateClaimTokenResult> {
  const { rawToken, ipHash, currentSessionUserId } = params;

  const windowBucket = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS).toString();
  const bucketKey = buildRateLimitKey(ipHash, windowBucket);
  const ttlEpochSeconds = Math.floor((Date.now() + RATE_LIMIT_TTL_BUFFER_MS) / 1000);
  const withinLimit = await checkAndIncrementRateLimit({
    bucketKey,
    limit: RATE_LIMIT_MAX_ATTEMPTS,
    ttlEpochSeconds,
  });
  if (!withinLimit) return { outcome: 'invalid' };

  const normalized = normalizeClaimToken(rawToken);
  if (!normalized) return { outcome: 'invalid' };

  const tokenHash = await hashClaimToken(normalized);
  const claim = await getClaimByTokenHashWithLazyExpiry(tokenHash);
  if (!claim) return { outcome: 'invalid' };

  if (claim.status === 'consumed') {
    if (currentSessionUserId && claim.consumedByUserId === currentSessionUserId) {
      return { outcome: 'resume', businessId: claim.businessId };
    }
    return { outcome: 'invalid' };
  }

  if (claim.status !== 'issued') return { outcome: 'invalid' }; // expired or revoked

  const business = await getBusinessById(claim.businessId);
  if (!business) return { outcome: 'invalid' };

  return { outcome: 'valid', claimId: claim.claimId, businessId: claim.businessId, businessName: business.name };
}
