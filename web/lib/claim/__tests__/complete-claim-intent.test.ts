/**
 * Unit tests for `completeClaimIntent` — the single claim-completion path
 * shared by password sign-up/sign-in and Google sign-in. All DB/cookie/
 * session interactions are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockGetClaimById, mockConsumeClaim, mockCreateCustomerSession, mockVerifyClaimIntent, mockCookieGet, mockCookieDelete } = vi.hoisted(() => ({
  mockGetClaimById: vi.fn(),
  mockConsumeClaim: vi.fn(),
  mockCreateCustomerSession: vi.fn(),
  mockVerifyClaimIntent: vi.fn(),
  mockCookieGet: vi.fn(),
  mockCookieDelete: vi.fn(),
}));

vi.mock('@/lib/db/claims', () => ({ getClaimById: mockGetClaimById, consumeClaim: mockConsumeClaim }));
vi.mock('@/lib/auth/customer-session', () => ({ createCustomerSession: mockCreateCustomerSession }));
vi.mock('@/lib/auth/claim-intent', () => ({
  CLAIM_INTENT_COOKIE_NAME: 'webpresa_claim_intent',
  verifyClaimIntent: mockVerifyClaimIntent,
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: mockCookieGet, delete: mockCookieDelete }),
}));

import { completeClaimIntent } from '../complete-claim-intent';

const SUB = 'cognito-sub-1';
const EMAIL = 'owner@example.com';
const CLAIM_ID = 'claim_1';
const BUSINESS_ID = 'biz_1';

beforeEach(() => {
  vi.clearAllMocks();
  mockCookieGet.mockReturnValue({ value: 'signed-intent-token' });
  mockVerifyClaimIntent.mockResolvedValue({ claimId: CLAIM_ID, businessId: BUSINESS_ID });
  mockGetClaimById.mockResolvedValue({ claimId: CLAIM_ID, businessId: BUSINESS_ID });
});

describe('completeClaimIntent', () => {
  it('errors when no claim-intent cookie is present', async () => {
    mockCookieGet.mockReturnValue(undefined);
    mockVerifyClaimIntent.mockResolvedValue(null);

    const result = await completeClaimIntent(SUB, EMAIL);

    expect(result).toEqual({ status: 'error', redirectTo: '/claim?error=1' });
    expect(mockConsumeClaim).not.toHaveBeenCalled();
  });

  it('errors when the claim no longer exists', async () => {
    mockGetClaimById.mockResolvedValue(null);
    const result = await completeClaimIntent(SUB, EMAIL);
    expect(result).toEqual({ status: 'error', redirectTo: '/claim?error=1' });
  });

  it('errors when the loaded claim businessId does not match the intent — defense in depth', async () => {
    mockGetClaimById.mockResolvedValue({ claimId: CLAIM_ID, businessId: 'a-different-business' });
    const result = await completeClaimIntent(SUB, EMAIL);
    expect(result).toEqual({ status: 'error', redirectTo: '/claim?error=1' });
    expect(mockConsumeClaim).not.toHaveBeenCalled();
  });

  it('succeeds, creates a session, and clears the claim-intent cookie on a fresh consume', async () => {
    mockConsumeClaim.mockResolvedValue({ outcome: 'consumed' });

    const result = await completeClaimIntent(SUB, EMAIL);

    expect(mockConsumeClaim).toHaveBeenCalledWith({ claimId: CLAIM_ID, businessId: BUSINESS_ID, userId: SUB });
    expect(mockCreateCustomerSession).toHaveBeenCalledWith({ sub: SUB, email: EMAIL });
    expect(mockCookieDelete).toHaveBeenCalledWith('webpresa_claim_intent');
    expect(result).toEqual({ status: 'success', redirectTo: '/account/claim-status' });
  });

  it('treats the same identity re-completing an already-owned claim as success, not an error — the Google-linking re-auth case', async () => {
    // consumeClaim itself already distinguishes "this exact user already
    // consumed it" from a genuine conflict — this is what makes Google
    // sign-in safe to re-run on a claim the same linked account already
    // owns (e.g. after Cognito's Pre Sign-up trigger links a Google
    // identity to an existing password account's sub).
    mockConsumeClaim.mockResolvedValue({ outcome: 'already_consumed_by_user' });

    const result = await completeClaimIntent(SUB, EMAIL);

    expect(mockCreateCustomerSession).toHaveBeenCalledWith({ sub: SUB, email: EMAIL });
    expect(result).toEqual({ status: 'success', redirectTo: '/account/claim-status' });
  });

  it('errors when consumeClaim reports a genuine conflict — someone else already owns it', async () => {
    mockConsumeClaim.mockResolvedValue({ outcome: 'conflict' });

    const result = await completeClaimIntent(SUB, EMAIL);

    expect(mockCreateCustomerSession).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'error', redirectTo: '/claim?error=1' });
  });
});
