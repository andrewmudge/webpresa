/**
 * Unit tests for the customer session JWT (Stage 17) — the encrypt/decrypt
 * contract only; cookie-store I/O (`createCustomerSession`/
 * `getCustomerSession`/`deleteCustomerSession`) is a thin `next/headers`
 * wrapper, not exercised here.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { SignJWT } from 'jose';

vi.mock('server-only', () => ({}));

import { encryptCustomerSession, decryptCustomerSession } from '../customer-session';

const SECRET = 'test-customer-session-secret-at-least-32-bytes!!';

beforeAll(() => {
  process.env.CUSTOMER_SESSION_SECRET = SECRET;
});

describe('encryptCustomerSession / decryptCustomerSession', () => {
  it('round-trips sub/email/expiresAt', async () => {
    const payload = { sub: 'cognito-sub-1', email: 'owner@example.com', expiresAt: new Date().toISOString() };
    const token = await encryptCustomerSession(payload);
    const decrypted = await decryptCustomerSession(token);
    expect(decrypted?.sub).toBe(payload.sub);
    expect(decrypted?.email).toBe(payload.email);
  });

  it('returns null for a missing token', async () => {
    expect(await decryptCustomerSession(undefined)).toBeNull();
  });

  it('returns null for a malformed token', async () => {
    expect(await decryptCustomerSession('not-a-jwt')).toBeNull();
  });

  it('rejects a token signed with the admin session secret — cannot be replayed as a customer session', async () => {
    const adminSignedToken = await new SignJWT({
      sub: 'admin',
      expiresAt: new Date().toISOString(),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode('a-completely-different-admin-secret!!'));

    expect(await decryptCustomerSession(adminSignedToken)).toBeNull();
  });
});
