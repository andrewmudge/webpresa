/**
 * Unit tests for the "Sign in with Google" OAuth callback — the one
 * completion path for both the claim/signup flow and the plain returning
 * sign-in flow, branching on whether a valid claim-intent cookie is
 * present (see the route's own doc comment).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const {
  mockExchangeGoogleOAuthCode,
  mockVerifyGoogleOAuthState,
  mockDecodeIdTokenClaims,
  mockVerifyClaimIntent,
  mockCompleteClaimIntent,
  mockCreateCustomerSession,
  mockCookieGet,
} = vi.hoisted(() => ({
  mockExchangeGoogleOAuthCode: vi.fn(),
  mockVerifyGoogleOAuthState: vi.fn(),
  mockDecodeIdTokenClaims: vi.fn(),
  mockVerifyClaimIntent: vi.fn(),
  mockCompleteClaimIntent: vi.fn(),
  mockCreateCustomerSession: vi.fn(),
  mockCookieGet: vi.fn(),
}));

vi.mock('@/lib/auth/google-oauth', () => ({ exchangeGoogleOAuthCode: mockExchangeGoogleOAuthCode }));
vi.mock('@/lib/auth/google-oauth-state', () => ({ verifyGoogleOAuthState: mockVerifyGoogleOAuthState }));
vi.mock('@/lib/auth/decode-id-token', () => ({ decodeIdTokenClaims: mockDecodeIdTokenClaims }));
vi.mock('@/lib/auth/claim-intent', () => ({
  CLAIM_INTENT_COOKIE_NAME: 'webpresa_claim_intent',
  verifyClaimIntent: mockVerifyClaimIntent,
}));
vi.mock('@/lib/claim/complete-claim-intent', () => ({ completeClaimIntent: mockCompleteClaimIntent }));
vi.mock('@/lib/auth/customer-session', () => ({ createCustomerSession: mockCreateCustomerSession }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: mockCookieGet }) }));

import { GET } from '../route';

const SUB = 'cognito-sub-1';
const EMAIL = 'owner@example.com';

function makeRequest(query: string) {
  return new NextRequest(`https://example.test/api/auth/google/callback${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyGoogleOAuthState.mockResolvedValue({ next: '/app' });
  mockExchangeGoogleOAuthCode.mockResolvedValue({ idToken: 'header.payload.sig' });
  mockDecodeIdTokenClaims.mockReturnValue({ sub: SUB, email: EMAIL });
  mockCookieGet.mockReturnValue(undefined);
  mockVerifyClaimIntent.mockResolvedValue(null);
});

describe('GET /api/auth/google/callback', () => {
  it('redirects to /claim?error=1 when code or state is missing', async () => {
    const response = await GET(makeRequest('?state=abc'));
    expect(response.headers.get('location')).toBe('https://example.test/claim?error=1');
    expect(mockExchangeGoogleOAuthCode).not.toHaveBeenCalled();
  });

  it('redirects to /claim?error=1 when state fails verification', async () => {
    mockVerifyGoogleOAuthState.mockResolvedValue(null);
    const response = await GET(makeRequest('?code=abc&state=tampered'));
    expect(response.headers.get('location')).toBe('https://example.test/claim?error=1');
  });

  it('redirects to /claim?error=1 when the token exchange fails', async () => {
    mockExchangeGoogleOAuthCode.mockResolvedValue(null);
    const response = await GET(makeRequest('?code=abc&state=valid'));
    expect(response.headers.get('location')).toBe('https://example.test/claim?error=1');
  });

  it('redirects to /claim?error=1 when the ID token cannot be decoded', async () => {
    mockDecodeIdTokenClaims.mockReturnValue(null);
    const response = await GET(makeRequest('?code=abc&state=valid'));
    expect(response.headers.get('location')).toBe('https://example.test/claim?error=1');
  });

  it('completes the claim flow when a valid claim-intent cookie is present', async () => {
    mockCookieGet.mockReturnValue({ value: 'signed-intent' });
    mockVerifyClaimIntent.mockResolvedValue({ claimId: 'claim_1', businessId: 'biz_1' });
    mockCompleteClaimIntent.mockResolvedValue({ status: 'success', redirectTo: '/account/claim-status' });

    const response = await GET(makeRequest('?code=abc&state=valid'));

    expect(mockCompleteClaimIntent).toHaveBeenCalledWith(SUB, EMAIL);
    expect(mockCreateCustomerSession).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe('https://example.test/account/claim-status');
  });

  it('propagates a claim-completion error redirect', async () => {
    mockCookieGet.mockReturnValue({ value: 'signed-intent' });
    mockVerifyClaimIntent.mockResolvedValue({ claimId: 'claim_1', businessId: 'biz_1' });
    mockCompleteClaimIntent.mockResolvedValue({ status: 'error', redirectTo: '/claim?error=1' });

    const response = await GET(makeRequest('?code=abc&state=valid'));

    expect(response.headers.get('location')).toBe('https://example.test/claim?error=1');
  });

  it('signs the customer in directly and redirects to state.next when no claim-intent cookie is present — plain sign-in', async () => {
    mockVerifyGoogleOAuthState.mockResolvedValue({ next: '/app/businesses/biz_1' });

    const response = await GET(makeRequest('?code=abc&state=valid'));

    expect(mockCompleteClaimIntent).not.toHaveBeenCalled();
    expect(mockCreateCustomerSession).toHaveBeenCalledWith({ sub: SUB, email: EMAIL });
    expect(response.headers.get('location')).toBe('https://example.test/app/businesses/biz_1');
  });
});
