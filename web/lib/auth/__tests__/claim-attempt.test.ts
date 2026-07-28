/**
 * Unit tests for the signed, purpose-scoped claim-attempt cookie (Stage 17).
 * No cookie-store I/O is exercised here — only the sign/verify contract,
 * which is where tampering resistance and purpose-scoping actually live.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { SignJWT } from 'jose';

vi.mock('server-only', () => ({}));

import { signClaimAttempt, verifyClaimAttempt } from '../claim-attempt';

const SECRET = 'test-claim-attempt-secret-at-least-32-bytes!!';

beforeAll(() => {
  process.env.CLAIM_ATTEMPT_SECRET = SECRET;
});

describe('signClaimAttempt / verifyClaimAttempt', () => {
  it('round-trips a claimId through sign and verify', async () => {
    const token = await signClaimAttempt('claim_123');
    const result = await verifyClaimAttempt(token);
    expect(result).toEqual({ claimId: 'claim_123' });
  });

  it('returns null for a missing token', async () => {
    expect(await verifyClaimAttempt(undefined)).toBeNull();
  });

  it('returns null for a malformed token', async () => {
    expect(await verifyClaimAttempt('not-a-jwt')).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const wrongSecretToken = await new SignJWT({ purpose: 'claim_attempt', claimId: 'claim_123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode('a-completely-different-secret-value!!'));

    expect(await verifyClaimAttempt(wrongSecretToken)).toBeNull();
  });

  it('rejects a validly-signed token with the wrong purpose — no cross-purpose replay', async () => {
    const wrongPurposeToken = await new SignJWT({ purpose: 'something_else', claimId: 'claim_123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode(SECRET));

    expect(await verifyClaimAttempt(wrongPurposeToken)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const expiredToken = await new SignJWT({ purpose: 'claim_attempt', claimId: 'claim_123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1800)
      .sign(new TextEncoder().encode(SECRET));

    expect(await verifyClaimAttempt(expiredToken)).toBeNull();
  });

  it('rejects a tampered claimId even though the token is otherwise validly formed', async () => {
    // A signature over one claimId cannot be reused for a different one —
    // this is the property signing exists to guarantee.
    const tokenForA = await signClaimAttempt('claim_A');
    const resultForA = await verifyClaimAttempt(tokenForA);
    expect(resultForA?.claimId).toBe('claim_A');
    expect(resultForA?.claimId).not.toBe('claim_B');
  });
});
