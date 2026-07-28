/**
 * Unit tests for claim-token generation, normalization, and hashing
 * (Stage 17). The Secrets Manager wrapper is mocked — no real AWS call.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetClaimTokenSecret = vi.hoisted(() => vi.fn());

vi.mock('@/lib/secrets', () => ({
  getClaimTokenSecret: mockGetClaimTokenSecret,
}));

vi.mock('server-only', () => ({}));

import { generateClaimToken, normalizeClaimToken, hashClaimToken, generateAndHashClaimToken } from '../token';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetClaimTokenSecret.mockResolvedValue({ hmacSecret: 'test-hmac-pepper-at-least-32-bytes!!' });
});

describe('generateClaimToken', () => {
  it('produces a dash-grouped, Crockford-Base32-only token with 160 bits of entropy', () => {
    const token = generateClaimToken();
    const stripped = token.replace(/-/g, '');

    // 160 bits / 5 bits-per-char = 32 base32 characters.
    expect(stripped).toHaveLength(32);
    expect(stripped).toMatch(/^[0-9A-HJKMNP-TV-Z]+$/); // excludes I, L, O, U
    expect(token).toContain('-');
  });

  it('generates a different token on every call', () => {
    expect(generateClaimToken()).not.toBe(generateClaimToken());
  });
});

describe('normalizeClaimToken', () => {
  it('strips dashes and whitespace and uppercases', () => {
    expect(normalizeClaimToken('xxxx-xxxx-xxxx-xxxx')).toBe('XXXXXXXXXXXXXXXX');
    expect(normalizeClaimToken('  XXXX XXXX ')).toBe('XXXXXXXX');
  });

  it('is idempotent — normalizing an already-normalized token is a no-op', () => {
    const normalized = normalizeClaimToken('abcd-efgh');
    expect(normalizeClaimToken(normalized)).toBe(normalized);
  });
});

describe('hashClaimToken', () => {
  it('is deterministic for the same normalized token and secret', async () => {
    const a = await hashClaimToken('SAMETOKEN');
    const b = await hashClaimToken('SAMETOKEN');
    expect(a).toBe(b);
  });

  it('differs for any single-character change in the input', async () => {
    const a = await hashClaimToken('TOKENAAAA');
    const b = await hashClaimToken('TOKENAAAB');
    expect(a).not.toBe(b);
  });

  it('differs across different secrets — HMAC, not plain SHA-256', async () => {
    mockGetClaimTokenSecret.mockResolvedValueOnce({ hmacSecret: 'secret-one-at-least-32-bytes-long!!' });
    const a = await hashClaimToken('SAMETOKEN');
    mockGetClaimTokenSecret.mockResolvedValueOnce({ hmacSecret: 'secret-two-at-least-32-bytes-long!!' });
    const b = await hashClaimToken('SAMETOKEN');
    expect(a).not.toBe(b);
  });

  it('produces a 64-character hex digest', async () => {
    const hash = await hashClaimToken('SAMETOKEN');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('generateAndHashClaimToken', () => {
  it('returns a raw token and a hash that verifies against its normalized form', async () => {
    const { rawToken, tokenHash } = await generateAndHashClaimToken();
    const expectedHash = await hashClaimToken(normalizeClaimToken(rawToken));
    expect(tokenHash).toBe(expectedHash);
  });
});
