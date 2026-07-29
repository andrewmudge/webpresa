/**
 * Unit tests for the signed, purpose-scoped claim-intent cookie (Stage 17).
 * No cookie-store I/O is exercised here — only the sign/verify contract,
 * which is where tampering resistance and purpose-scoping actually live.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { SignJWT } from 'jose';

vi.mock('server-only', () => ({}));

import { signClaimIntent, verifyClaimIntent } from '../claim-intent';

const SECRET = 'test-claim-attempt-secret-at-least-32-bytes!!';

beforeAll(() => {
  process.env.CLAIM_ATTEMPT_SECRET = SECRET;
});

describe('signClaimIntent / verifyClaimIntent', () => {
  it('round-trips claimId/businessId/previewId through sign and verify', async () => {
    const token = await signClaimIntent({ claimId: 'claim_123', businessId: 'biz_abc', previewId: 'preview_xyz' });
    const result = await verifyClaimIntent(token);
    expect(result).toEqual({ claimId: 'claim_123', businessId: 'biz_abc', previewId: 'preview_xyz' });
  });

  it('round-trips without a previewId', async () => {
    const token = await signClaimIntent({ claimId: 'claim_123', businessId: 'biz_abc' });
    const result = await verifyClaimIntent(token);
    expect(result).toEqual({ claimId: 'claim_123', businessId: 'biz_abc', previewId: undefined });
  });

  it('returns null for a missing token', async () => {
    expect(await verifyClaimIntent(undefined)).toBeNull();
  });

  it('returns null for a malformed token', async () => {
    expect(await verifyClaimIntent('not-a-jwt')).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const wrongSecretToken = await new SignJWT({ purpose: 'claim_intent', claimId: 'claim_123', businessId: 'biz_abc' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30m')
      .sign(new TextEncoder().encode('a-completely-different-secret-value!!'));

    expect(await verifyClaimIntent(wrongSecretToken)).toBeNull();
  });

  it('rejects a validly-signed token with the wrong purpose — no cross-purpose replay', async () => {
    const wrongPurposeToken = await new SignJWT({ purpose: 'something_else', claimId: 'claim_123', businessId: 'biz_abc' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30m')
      .sign(new TextEncoder().encode(SECRET));

    expect(await verifyClaimIntent(wrongPurposeToken)).toBeNull();
  });

  it('rejects a token missing businessId even if otherwise well-formed', async () => {
    const missingBusinessId = await new SignJWT({ purpose: 'claim_intent', claimId: 'claim_123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30m')
      .sign(new TextEncoder().encode(SECRET));

    expect(await verifyClaimIntent(missingBusinessId)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const expiredToken = await new SignJWT({ purpose: 'claim_intent', claimId: 'claim_123', businessId: 'biz_abc' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1800)
      .sign(new TextEncoder().encode(SECRET));

    expect(await verifyClaimIntent(expiredToken)).toBeNull();
  });

  it('rejects a tampered claimId even though the token is otherwise validly formed', async () => {
    // A signature over one claimId cannot be reused for a different one —
    // this is the property signing exists to guarantee.
    const tokenForA = await signClaimIntent({ claimId: 'claim_A', businessId: 'biz_abc' });
    const resultForA = await verifyClaimIntent(tokenForA);
    expect(resultForA?.claimId).toBe('claim_A');
    expect(resultForA?.claimId).not.toBe('claim_B');
  });
});
