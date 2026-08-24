/**
 * Unit tests for the signed OAuth `state` token used by "Sign in with
 * Google" (see `google-oauth-state.ts`'s doc comment for why this is a
 * signed JWT rather than a nonce-plus-cookie pair).
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { SignJWT } from 'jose';

vi.mock('server-only', () => ({}));

import { signGoogleOAuthState, verifyGoogleOAuthState } from '../google-oauth-state';

const SECRET = 'test-google-oauth-state-secret-at-least-32-bytes!!';

beforeAll(() => {
  process.env.GOOGLE_OAUTH_STATE_SECRET = SECRET;
});

describe('signGoogleOAuthState / verifyGoogleOAuthState', () => {
  it('round-trips next through sign and verify', async () => {
    const token = await signGoogleOAuthState('/app/businesses/biz_1');
    expect(await verifyGoogleOAuthState(token)).toEqual({ next: '/app/businesses/biz_1' });
  });

  it('returns null for a missing token', async () => {
    expect(await verifyGoogleOAuthState(null)).toBeNull();
    expect(await verifyGoogleOAuthState(undefined)).toBeNull();
  });

  it('returns null for a malformed token', async () => {
    expect(await verifyGoogleOAuthState('not-a-jwt')).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const wrongSecretToken = await new SignJWT({ next: '/app' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(new TextEncoder().encode('a-completely-different-secret-value!!'));

    expect(await verifyGoogleOAuthState(wrongSecretToken)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const expiredToken = await new SignJWT({ next: '/app' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1800)
      .sign(new TextEncoder().encode(SECRET));

    expect(await verifyGoogleOAuthState(expiredToken)).toBeNull();
  });

  it('rejects a token missing next', async () => {
    const missingNext = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(new TextEncoder().encode(SECRET));

    expect(await verifyGoogleOAuthState(missingNext)).toBeNull();
  });
});
