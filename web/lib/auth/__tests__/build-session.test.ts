/**
 * Unit tests for the signed, purpose-scoped build-session cookie — the
 * self-service `/build` funnel's counterpart to `claim-intent.test.ts`.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { SignJWT } from 'jose';

vi.mock('server-only', () => ({}));

import { signBuildSession, verifyBuildSession, buildSessionAuthorizes } from '../build-session';

const SECRET = 'test-build-session-secret-at-least-32-bytes!!';

beforeAll(() => {
  process.env.BUILD_SESSION_SECRET = SECRET;
});

describe('signBuildSession / verifyBuildSession', () => {
  it('round-trips businessId/buildId through sign and verify', async () => {
    const token = await signBuildSession({ businessId: 'biz_abc', buildId: 'scanexec_123' });
    const result = await verifyBuildSession(token);
    expect(result).toEqual({ businessId: 'biz_abc', buildId: 'scanexec_123' });
  });

  it('returns null for a missing token', async () => {
    expect(await verifyBuildSession(undefined)).toBeNull();
  });

  it('returns null for a malformed token', async () => {
    expect(await verifyBuildSession('not-a-jwt')).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const wrongSecretToken = await new SignJWT({ purpose: 'self_service_build', businessId: 'biz_abc', buildId: 'scanexec_123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('120m')
      .sign(new TextEncoder().encode('a-completely-different-secret-value!!'));

    expect(await verifyBuildSession(wrongSecretToken)).toBeNull();
  });

  it('rejects a validly-signed token with the wrong purpose — no cross-purpose replay with claim-intent', async () => {
    const wrongPurposeToken = await new SignJWT({ purpose: 'claim_intent', businessId: 'biz_abc', buildId: 'scanexec_123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('120m')
      .sign(new TextEncoder().encode(SECRET));

    expect(await verifyBuildSession(wrongPurposeToken)).toBeNull();
  });

  it('rejects a token missing buildId even if otherwise well-formed', async () => {
    const missingBuildId = await new SignJWT({ purpose: 'self_service_build', businessId: 'biz_abc' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('120m')
      .sign(new TextEncoder().encode(SECRET));

    expect(await verifyBuildSession(missingBuildId)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const expiredToken = await new SignJWT({ purpose: 'self_service_build', businessId: 'biz_abc', buildId: 'scanexec_123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(new TextEncoder().encode(SECRET));

    expect(await verifyBuildSession(expiredToken)).toBeNull();
  });
});

describe('buildSessionAuthorizes', () => {
  it('authorizes only an exact buildId match', () => {
    const session = { businessId: 'biz_abc', buildId: 'scanexec_123' };
    expect(buildSessionAuthorizes(session, 'scanexec_123')).toBe(true);
    expect(buildSessionAuthorizes(session, 'scanexec_999')).toBe(false);
  });

  it('never authorizes a null session', () => {
    expect(buildSessionAuthorizes(null, 'scanexec_123')).toBe(false);
  });
});
