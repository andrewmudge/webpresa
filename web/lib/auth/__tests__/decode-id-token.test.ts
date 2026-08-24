/**
 * Unit tests for the shared ID-token claim decoder (extracted from
 * `customer-cognito.ts` so the Google OAuth callback can reuse it).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { decodeIdTokenClaims } from '../decode-id-token';

function fakeIdToken(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.signature`;
}

describe('decodeIdTokenClaims', () => {
  it('extracts sub and email from a well-formed token', () => {
    const token = fakeIdToken({ sub: 'sub-123', email: 'jane@example.com', other: 'ignored' });
    expect(decodeIdTokenClaims(token)).toEqual({ sub: 'sub-123', email: 'jane@example.com' });
  });

  it('returns null when sub is missing', () => {
    expect(decodeIdTokenClaims(fakeIdToken({ email: 'jane@example.com' }))).toBeNull();
  });

  it('returns null when email is missing', () => {
    expect(decodeIdTokenClaims(fakeIdToken({ sub: 'sub-123' }))).toBeNull();
  });

  it('returns null for a malformed token', () => {
    expect(decodeIdTokenClaims('not-a-jwt')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(decodeIdTokenClaims('')).toBeNull();
  });

  it('returns null when the payload segment is not valid base64url JSON', () => {
    expect(decodeIdTokenClaims('header.%%%not-base64%%%.signature')).toBeNull();
  });
});
