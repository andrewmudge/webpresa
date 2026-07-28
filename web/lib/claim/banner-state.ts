import type { Business } from '@/domain/models/business';

/**
 * The public preview's claim-banner state (Stage 17) — deliberately three
 * states, not a single ownership flip, so a claimed-but-never-paid business
 * doesn't permanently lose its conversion-driving banner (see
 * implementation.md, Stage 17, "Public claim-banner behavior").
 */
export const CLAIM_BANNER_STATES = ['unclaimed', 'claimed_pending', 'active'] as const;
export type ClaimBannerState = (typeof CLAIM_BANNER_STATES)[number];

/**
 * Derives the banner state from ownership alone — Stage 17 has no
 * subscription concept yet, so `'active'` is defined here but structurally
 * unreachable until Stage 18 supplies real subscription data into this same
 * function. The exactly-once claim guarantee itself is enforced
 * independently by the ownership-reservation transaction
 * (`lib/db/claims.ts`, `consumeClaim`), not by banner content — this
 * function only decides what the public page *says*.
 */
export function getClaimBannerState(business: Pick<Business, 'ownerUserId'>): ClaimBannerState {
  if (!business.ownerUserId) return 'unclaimed';
  return 'claimed_pending';
}
