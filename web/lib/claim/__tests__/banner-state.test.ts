/**
 * The ownerUserId/subscriptionStatus branching itself is already covered by
 * `domain/__tests__/stage17.test.ts` — this file covers only the new
 * source-based branching added for the self-service funnel.
 */
import { describe, it, expect } from 'vitest';
import { getClaimBannerState } from '../banner-state';

describe('getClaimBannerState — source-based branching', () => {
  it('returns unclaimed for an unowned, non-self-service business', () => {
    expect(getClaimBannerState({ source: 'google_places' })).toBe('unclaimed');
    expect(getClaimBannerState({ source: 'manual' })).toBe('unclaimed');
    expect(getClaimBannerState({ source: 'scan' })).toBe('unclaimed');
  });

  it('returns self_service_ready for an unowned self-service business — never the postcard "is this your business?" framing', () => {
    expect(getClaimBannerState({ source: 'self_service' })).toBe('self_service_ready');
  });

  it('source has no effect once owned — claimed_pending/active still key off ownerUserId/subscriptionStatus only', () => {
    expect(getClaimBannerState({ source: 'self_service', ownerUserId: 'sub_1' })).toBe('claimed_pending');
    expect(getClaimBannerState({ source: 'self_service', ownerUserId: 'sub_1', subscriptionStatus: 'active' })).toBe('active');
  });
});
