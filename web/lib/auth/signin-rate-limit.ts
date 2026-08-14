import 'server-only';
import { TABLE_CLAIMS } from '@/lib/db/client';
import { checkAndIncrementRateLimit, buildRateLimitKey } from '@/lib/db/rate-limit';

/**
 * Stage 25 (Security Hardening) — IP-hash rate limiting for admin sign-in
 * (`lib/auth/actions.ts`'s `signIn`), which previously had no attempt
 * throttling at all (scrypt slows a single guess, but nothing bounded
 * total attempt volume).
 *
 * Reuses the generic fixed-window counter (`lib/db/rate-limit.ts`) that
 * Stage 17's claim-token validation and Stage 20's lead submission already
 * established, rather than a new mechanism or a new table. The Claims
 * table is reused as the counter's backing store purely because it already
 * has the `ttl` attribute this pattern needs (see `lib/db/claims.ts`'s own
 * identical reuse for its rate-limit counters) — the `admin-signin:`
 * scope prefix keeps these counter items textually distinct from both real
 * `claimId` values (`claim_<uuid>`) and claim-token rate-limit buckets
 * (`RATELIMIT#<ipHash>#...`, no scope prefix).
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;
/** Counter items are cleaned up well after their window closes — TTL is cleanup only, not the enforcement mechanism. */
const TTL_BUFFER_MS = WINDOW_MS * 2;

/**
 * Returns `false` once the window's attempt limit is reached for this IP
 * hash — the caller treats that identically to an invalid credential
 * response (never a distinct "rate limited" message, matching this repo's
 * existing convention for every other rate-limited entrypoint).
 */
export async function checkAdminSignInRateLimit(ipHash: string): Promise<boolean> {
  const windowBucket = Math.floor(Date.now() / WINDOW_MS).toString();
  const bucketKey = buildRateLimitKey(`admin-signin:${ipHash}`, windowBucket);
  const ttlEpochSeconds = Math.floor((Date.now() + TTL_BUFFER_MS) / 1000);

  return checkAndIncrementRateLimit({
    tableName: TABLE_CLAIMS(),
    partitionKeyName: 'claimId',
    bucketKey,
    limit: MAX_ATTEMPTS,
    ttlEpochSeconds,
  });
}
