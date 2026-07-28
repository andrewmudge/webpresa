/**
 * Unit tests for the shared claim-token validation logic (Stage 17) — the
 * entrypoint-agnostic core used by both `GET /claim/[claimToken]` and the
 * `POST /claim` manual-entry form. Every DB/secrets dependency is mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetClaimByTokenHashWithLazyExpiry = vi.hoisted(() => vi.fn());
const mockCheckAndIncrementRateLimit = vi.hoisted(() => vi.fn());
const mockGetBusinessById = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db/claims', () => ({
  getClaimByTokenHashWithLazyExpiry: mockGetClaimByTokenHashWithLazyExpiry,
  checkAndIncrementRateLimit: mockCheckAndIncrementRateLimit,
  buildRateLimitKey: (ipHash: string, windowBucket: string) => `RATELIMIT#${ipHash}#${windowBucket}`,
}));

vi.mock('@/lib/db/businesses', () => ({
  getBusinessById: mockGetBusinessById,
}));

// Token normalization/hashing is exercised on its own in token.test.ts —
// here it only needs to be deterministic so the mocked repo calls above
// receive a stable-shaped hash.
vi.mock('@/lib/claim/token', () => ({
  normalizeClaimToken: (input: string) => input.replace(/[\s-]/g, '').toUpperCase(),
  hashClaimToken: async (normalized: string) => `hash-of-${normalized}`,
}));

vi.mock('server-only', () => ({}));

import { validateClaimToken, hashIp } from '../validate-token';

const CLAIM = {
  claimId: 'claim_1',
  businessId: 'biz_1',
  tokenHash: 'irrelevant-since-hashClaimToken-is-not-mocked',
  status: 'issued' as const,
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckAndIncrementRateLimit.mockResolvedValue(true);
});

describe('hashIp', () => {
  it('is deterministic and does not return the raw IP', () => {
    const hash = hashIp('203.0.113.5');
    expect(hash).not.toContain('203.0.113.5');
    expect(hashIp('203.0.113.5')).toBe(hash);
  });
});

describe('validateClaimToken', () => {
  it('returns "invalid" once the rate limit is exceeded, without looking up the claim', async () => {
    mockCheckAndIncrementRateLimit.mockResolvedValueOnce(false);
    const result = await validateClaimToken({ rawToken: 'XXXX-XXXX-XXXX-XXXX', ipHash: 'hash' });
    expect(result).toEqual({ outcome: 'invalid' });
    expect(mockGetClaimByTokenHashWithLazyExpiry).not.toHaveBeenCalled();
  });

  it('returns "invalid" when no claim matches', async () => {
    mockGetClaimByTokenHashWithLazyExpiry.mockResolvedValueOnce(null);
    const result = await validateClaimToken({ rawToken: 'XXXX-XXXX-XXXX-XXXX', ipHash: 'hash' });
    expect(result).toEqual({ outcome: 'invalid' });
  });

  it('returns "invalid" for an expired claim', async () => {
    mockGetClaimByTokenHashWithLazyExpiry.mockResolvedValueOnce({ ...CLAIM, status: 'expired' });
    const result = await validateClaimToken({ rawToken: 'XXXX-XXXX-XXXX-XXXX', ipHash: 'hash' });
    expect(result).toEqual({ outcome: 'invalid' });
  });

  it('returns "invalid" for a revoked claim', async () => {
    mockGetClaimByTokenHashWithLazyExpiry.mockResolvedValueOnce({ ...CLAIM, status: 'revoked' });
    const result = await validateClaimToken({ rawToken: 'XXXX-XXXX-XXXX-XXXX', ipHash: 'hash' });
    expect(result).toEqual({ outcome: 'invalid' });
  });

  it('returns "invalid" for a claim already consumed by a different session', async () => {
    mockGetClaimByTokenHashWithLazyExpiry.mockResolvedValueOnce({
      ...CLAIM,
      status: 'consumed',
      consumedByUserId: 'someone-else',
    });
    const result = await validateClaimToken({
      rawToken: 'XXXX-XXXX-XXXX-XXXX',
      ipHash: 'hash',
      currentSessionUserId: 'me',
    });
    expect(result).toEqual({ outcome: 'invalid' });
  });

  it('returns "resume" for a claim consumed by the current session — idempotent resume', async () => {
    mockGetClaimByTokenHashWithLazyExpiry.mockResolvedValueOnce({
      ...CLAIM,
      status: 'consumed',
      consumedByUserId: 'me',
    });
    const result = await validateClaimToken({
      rawToken: 'XXXX-XXXX-XXXX-XXXX',
      ipHash: 'hash',
      currentSessionUserId: 'me',
    });
    expect(result).toEqual({ outcome: 'resume', businessId: 'biz_1' });
  });

  it('returns "invalid" when the claim is issued but its business no longer exists', async () => {
    mockGetClaimByTokenHashWithLazyExpiry.mockResolvedValueOnce(CLAIM);
    mockGetBusinessById.mockResolvedValueOnce(null);
    const result = await validateClaimToken({ rawToken: 'XXXX-XXXX-XXXX-XXXX', ipHash: 'hash' });
    expect(result).toEqual({ outcome: 'invalid' });
  });

  it('returns "valid" with the business name for a genuinely valid, issued, unexpired claim', async () => {
    mockGetClaimByTokenHashWithLazyExpiry.mockResolvedValueOnce(CLAIM);
    mockGetBusinessById.mockResolvedValueOnce({ businessId: 'biz_1', name: 'Acme Plumbing' });
    const result = await validateClaimToken({ rawToken: 'XXXX-XXXX-XXXX-XXXX', ipHash: 'hash' });
    expect(result).toEqual({
      outcome: 'valid',
      claimId: 'claim_1',
      businessId: 'biz_1',
      businessName: 'Acme Plumbing',
    });
  });
});
