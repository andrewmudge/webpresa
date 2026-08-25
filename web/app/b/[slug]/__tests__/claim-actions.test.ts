/**
 * Unit tests for the "Make It Mine" banner Server Action — glue only
 * (`startSelfServiceClaim` itself is fully covered by
 * `lib/claim/__tests__/start-self-service-claim.test.ts`): cookie/redirect
 * wiring, and that an ineligible business is sent back to `/build` rather
 * than silently granted a claim-intent cookie.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
);
const mockCookieSet = vi.hoisted(() => vi.fn());
const mockStartSelfServiceClaim = vi.hoisted(() => vi.fn());
const mockSignClaimIntent = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('next/headers', () => ({ cookies: async () => ({ set: mockCookieSet }) }));
vi.mock('@/lib/claim/start-self-service-claim', () => ({ startSelfServiceClaim: mockStartSelfServiceClaim }));
vi.mock('@/lib/auth/claim-intent', () => ({
  signClaimIntent: mockSignClaimIntent,
  CLAIM_INTENT_COOKIE_NAME: 'webpresa_claim_intent',
  CLAIM_INTENT_MAX_AGE_SECONDS: 1800,
}));

import { startSelfServiceClaimAction } from '../claim-actions';

beforeEach(() => {
  vi.clearAllMocks();
  mockSignClaimIntent.mockResolvedValue('signed.jwt');
});

describe('startSelfServiceClaimAction', () => {
  it('issues the claim, sets the claim_intent cookie, and redirects to /claim/continue', async () => {
    mockStartSelfServiceClaim.mockResolvedValueOnce({ status: 'issued', claimId: 'claim_1', previewId: 'preview_1' });

    await expect(startSelfServiceClaimAction('biz_1')).rejects.toThrow('REDIRECT:/claim/continue');

    expect(mockSignClaimIntent).toHaveBeenCalledWith({ claimId: 'claim_1', businessId: 'biz_1', previewId: 'preview_1' });
    expect(mockCookieSet).toHaveBeenCalledWith(
      'webpresa_claim_intent',
      'signed.jwt',
      expect.objectContaining({ httpOnly: true, maxAge: 1800 }),
    );
  });

  it('redirects back to /build without setting any cookie when the business is not eligible', async () => {
    mockStartSelfServiceClaim.mockResolvedValueOnce({ status: 'not_eligible' });

    await expect(startSelfServiceClaimAction('biz_1')).rejects.toThrow('REDIRECT:/build');

    expect(mockCookieSet).not.toHaveBeenCalled();
    expect(mockSignClaimIntent).not.toHaveBeenCalled();
  });
});
