import type { Business } from '@/domain/models/business';

/**
 * The public preview's claim-banner state (Stage 17, extended for the
 * self-service funnel) — deliberately four states, not a single ownership
 * flip, so a claimed-but-never-paid business doesn't permanently lose its
 * conversion-driving banner (see implementation.md, Stage 17, "Public
 * claim-banner behavior"), and a self-service creator sees copy that
 * matches what they just did ("make it yours") rather than the postcard
 * flow's "is this your business?" framing, which would be a strange thing
 * to ask someone who just built the site themselves.
 */
export const CLAIM_BANNER_STATES = ['unclaimed', 'claimed_pending', 'active', 'self_service_ready'] as const;
export type ClaimBannerState = (typeof CLAIM_BANNER_STATES)[number];

/**
 * Derives the banner state from ownership, source, and Stage 18's real
 * subscription status. `'active'` requires `subscriptionStatus === 'active'`
 * specifically — a `past_due`/`billing_recovery` business stays
 * `'claimed_pending'` rather than silently flipping back to a
 * conversion-driving state, and a `canceled` business likewise.
 *
 * An unclaimed `source: 'self_service'` business gets its own state
 * (`'self_service_ready'`) rather than falling into `'unclaimed'` — that
 * state's copy ("is this your business?") is written for a cold postcard
 * recipient, not a visitor who just built the site through `/build`
 * themselves. The exactly-once claim guarantee itself is enforced
 * independently by the ownership-reservation transaction (`lib/db/claims.ts`,
 * `consumeClaim`), not by banner content — this function only decides what
 * the public page *says*.
 */
export function getClaimBannerState(
  business: Pick<Business, 'ownerUserId' | 'subscriptionStatus' | 'source'>,
): ClaimBannerState {
  if (!business.ownerUserId) {
    return business.source === 'self_service' ? 'self_service_ready' : 'unclaimed';
  }
  if (business.subscriptionStatus === 'active') return 'active';
  return 'claimed_pending';
}
