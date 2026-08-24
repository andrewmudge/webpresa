/**
 * Unit tests for the "Sign in with Google" entry route — a plain redirect
 * to Cognito Hosted UI, carrying a signed `state` (see
 * `lib/auth/google-oauth-state.ts`) that encodes the post-sign-in
 * destination for the plain returning-sign-in entry point.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const { mockBuildGoogleAuthorizeUrl, mockSignGoogleOAuthState } = vi.hoisted(() => ({
  mockBuildGoogleAuthorizeUrl: vi.fn(),
  mockSignGoogleOAuthState: vi.fn(),
}));

vi.mock('@/lib/auth/google-oauth', () => ({ buildGoogleAuthorizeUrl: mockBuildGoogleAuthorizeUrl }));
vi.mock('@/lib/auth/google-oauth-state', () => ({ signGoogleOAuthState: mockSignGoogleOAuthState }));

import { GET } from '../route';

function makeRequest(query = '') {
  return new NextRequest(`https://example.test/api/auth/google/start${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSignGoogleOAuthState.mockResolvedValue('signed-state-token');
  mockBuildGoogleAuthorizeUrl.mockReturnValue('https://cognito-domain.example/oauth2/authorize?state=signed-state-token');
});

describe('GET /api/auth/google/start', () => {
  it('signs state with the default next (/app) when no ?next= is given', async () => {
    const response = await GET(makeRequest());
    expect(mockSignGoogleOAuthState).toHaveBeenCalledWith('/app');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://cognito-domain.example/oauth2/authorize?state=signed-state-token');
  });

  it('signs state with an allowed ?next= value', async () => {
    await GET(makeRequest('?next=%2Fapp%2Fbusinesses%2Fbiz_1'));
    expect(mockSignGoogleOAuthState).toHaveBeenCalledWith('/app/businesses/biz_1');
  });

  it('falls back to /app for a ?next= value outside the allowed prefixes — no open redirect', async () => {
    await GET(makeRequest('?next=https%3A%2F%2Fevil.example%2Fphish'));
    expect(mockSignGoogleOAuthState).toHaveBeenCalledWith('/app');
  });
});
