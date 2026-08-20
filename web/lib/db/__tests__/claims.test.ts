/**
 * Unit tests for the Claims repository (Stage 17).
 * All DynamoDB interactions are mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConditionalCheckFailedException, TransactionCanceledException } from '@aws-sdk/client-dynamodb';

const mockSend = vi.fn();
const mockAdvanceBusinessStatus = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db/client', () => ({
  getDynamoDBClient: () => ({ send: mockSend }),
  TABLE_CLAIMS: () => 'webpresa-test-claims',
  TABLE_BUSINESSES: () => 'webpresa-test-businesses',
}));

vi.mock('@/lib/db/businesses', () => ({ advanceBusinessStatus: mockAdvanceBusinessStatus }));

vi.mock('server-only', () => ({}));

import {
  getClaimById,
  getClaimByTokenHashWithLazyExpiry,
  listClaimsForBusiness,
  putClaim,
  revokeClaim,
  consumeClaim,
  checkAndIncrementRateLimit,
  buildRateLimitKey,
} from '@/lib/db/claims';
import { createClaim } from '@/domain/factories/claim.factory';

function makeClaim(overrides: Partial<ReturnType<typeof createClaim>> = {}) {
  return {
    ...createClaim({
      businessId: 'biz_00000000-0000-0000-0000-000000000001',
      tokenHash: 'a'.repeat(64),
    }),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAdvanceBusinessStatus.mockResolvedValue(true);
});

describe('getClaimById', () => {
  it('returns a parsed Claim when the item exists', async () => {
    const claim = makeClaim();
    mockSend.mockResolvedValueOnce({ Item: claim });
    const result = await getClaimById(claim.claimId);
    expect(result?.claimId).toBe(claim.claimId);
  });

  it('returns null when the item does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });
    expect(await getClaimById('claim_missing')).toBeNull();
  });
});

describe('getClaimByTokenHashWithLazyExpiry', () => {
  it('returns null when no claim matches the token hash', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    expect(await getClaimByTokenHashWithLazyExpiry('a'.repeat(64))).toBeNull();
  });

  it('returns an unexpired issued claim as-is, without a second call', async () => {
    const claim = makeClaim();
    mockSend.mockResolvedValueOnce({ Items: [claim] });
    const result = await getClaimByTokenHashWithLazyExpiry(claim.tokenHash);
    expect(result?.status).toBe('issued');
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('returns consumed/revoked claims as-is without attempting the expiry transition', async () => {
    const claim = makeClaim({ status: 'revoked', revokedAt: new Date().toISOString() });
    mockSend.mockResolvedValueOnce({ Items: [claim] });
    const result = await getClaimByTokenHashWithLazyExpiry(claim.tokenHash);
    expect(result?.status).toBe('revoked');
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('lazily transitions an expired-but-still-"issued" claim to "expired"', async () => {
    const claim = makeClaim({ expiresAt: new Date(Date.now() - 1000).toISOString() });
    mockSend.mockResolvedValueOnce({ Items: [claim] }); // the query
    mockSend.mockResolvedValueOnce({}); // the conditional UpdateCommand succeeds

    const result = await getClaimByTokenHashWithLazyExpiry(claim.tokenHash);

    expect(result?.status).toBe('expired');
    expect(mockSend).toHaveBeenCalledTimes(2);
    const updateCommand = mockSend.mock.calls[1][0];
    expect(updateCommand.input.ConditionExpression).toBe('#status = :issued');
  });

  it('re-reads the claim when the lazy-expiry transition loses a race to a concurrent consume', async () => {
    const claim = makeClaim({ expiresAt: new Date(Date.now() - 1000).toISOString() });
    const consumedByOther = { ...claim, status: 'consumed' as const, consumedByUserId: 'other-user' };
    mockSend.mockResolvedValueOnce({ Items: [claim] }); // the query
    mockSend.mockRejectedValueOnce(
      new ConditionalCheckFailedException({ message: 'conditional check failed', $metadata: {} }),
    );
    mockSend.mockResolvedValueOnce({ Item: consumedByOther }); // the re-read via getClaimById

    const result = await getClaimByTokenHashWithLazyExpiry(claim.tokenHash);

    expect(result?.status).toBe('consumed');
    expect(result?.consumedByUserId).toBe('other-user');
  });
});

describe('listClaimsForBusiness', () => {
  it('queries business-id-index, newest first', async () => {
    const claim = makeClaim();
    mockSend.mockResolvedValueOnce({ Items: [claim] });
    const result = await listClaimsForBusiness(claim.businessId);
    expect(result).toHaveLength(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.IndexName).toBe('business-id-index');
    expect(command.input.ScanIndexForward).toBe(false);
  });
});

describe('putClaim', () => {
  it('validates and writes the claim', async () => {
    const claim = makeClaim();
    mockSend.mockResolvedValueOnce({});
    await putClaim(claim);
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('throws on an invalid claim rather than writing it', async () => {
    const claim = makeClaim();
    await expect(putClaim({ ...claim, tokenHash: 'not-a-hash' })).rejects.toThrow();
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('revokeClaim', () => {
  it('returns true when the conditional update succeeds', async () => {
    mockSend.mockResolvedValueOnce({});
    expect(await revokeClaim('claim_x', 'Revoked by admin')).toBe(true);
  });

  it('returns false (never throws) when the claim is not in "issued" status', async () => {
    mockSend.mockRejectedValueOnce(
      new ConditionalCheckFailedException({ message: 'conditional check failed', $metadata: {} }),
    );
    expect(await revokeClaim('claim_x')).toBe(false);
  });
});

describe('consumeClaim', () => {
  const params = {
    claimId: 'claim_00000000-0000-0000-0000-000000000099',
    businessId: 'biz_00000000-0000-0000-0000-000000000099',
    userId: 'cognito-sub-1',
  };

  it('returns "consumed" when the transaction commits, and advances business status to claimed', async () => {
    mockSend.mockResolvedValueOnce({});
    const result = await consumeClaim(params);
    expect(result).toEqual({ outcome: 'consumed' });
    expect(mockAdvanceBusinessStatus).toHaveBeenCalledWith(params.businessId, 'claimed');
  });

  it('still returns "consumed" when advancing business status fails — best-effort, decoupled from the ownership grant', async () => {
    mockSend.mockResolvedValueOnce({});
    mockAdvanceBusinessStatus.mockRejectedValueOnce(new Error('conditional write failed'));
    const result = await consumeClaim(params);
    expect(result).toEqual({ outcome: 'consumed' });
  });

  it('returns "already_consumed_by_user" — an idempotent double-submit by the same user', async () => {
    mockSend.mockRejectedValueOnce(
      new TransactionCanceledException({ message: 'cancelled', $metadata: {} }),
    );
    mockSend.mockResolvedValueOnce({
      Item: makeClaim({ claimId: params.claimId, status: 'consumed', consumedByUserId: params.userId }),
    });

    const result = await consumeClaim(params);
    expect(result).toEqual({ outcome: 'already_consumed_by_user' });
    expect(mockAdvanceBusinessStatus).not.toHaveBeenCalled();
  });

  it('returns "conflict" when someone else already consumed the claim', async () => {
    mockSend.mockRejectedValueOnce(
      new TransactionCanceledException({ message: 'cancelled', $metadata: {} }),
    );
    mockSend.mockResolvedValueOnce({
      Item: makeClaim({ claimId: params.claimId, status: 'consumed', consumedByUserId: 'someone-else' }),
    });

    const result = await consumeClaim(params);
    expect(result).toEqual({ outcome: 'conflict' });
    expect(mockAdvanceBusinessStatus).not.toHaveBeenCalled();
  });

  it('returns "conflict" when the business condition failed (already owned) and the claim is still "issued"', async () => {
    mockSend.mockRejectedValueOnce(
      new TransactionCanceledException({ message: 'cancelled', $metadata: {} }),
    );
    mockSend.mockResolvedValueOnce({ Item: makeClaim({ claimId: params.claimId, status: 'issued' }) });

    const result = await consumeClaim(params);
    expect(result).toEqual({ outcome: 'conflict' });
    expect(mockAdvanceBusinessStatus).not.toHaveBeenCalled();
  });

  it('re-throws unrelated errors', async () => {
    mockSend.mockRejectedValueOnce(new Error('network blip'));
    await expect(consumeClaim(params)).rejects.toThrow('network blip');
  });
});

describe('buildRateLimitKey', () => {
  it('builds a RATELIMIT#<ipHash>#<windowBucket> key', () => {
    expect(buildRateLimitKey('abc123', '999')).toBe('RATELIMIT#abc123#999');
  });
});

describe('checkAndIncrementRateLimit', () => {
  it('returns true and uses the attribute_not_exists-OR condition (not a bare comparison)', async () => {
    mockSend.mockResolvedValueOnce({});
    const result = await checkAndIncrementRateLimit({
      bucketKey: 'RATELIMIT#abc#1',
      limit: 10,
      ttlEpochSeconds: Math.floor(Date.now() / 1000) + 3600,
    });

    expect(result).toBe(true);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.ConditionExpression).toBe('attribute_not_exists(#count) OR #count < :limit');
  });

  it('returns false (never throws) once the window limit is reached', async () => {
    mockSend.mockRejectedValueOnce(
      new ConditionalCheckFailedException({ message: 'conditional check failed', $metadata: {} }),
    );
    const result = await checkAndIncrementRateLimit({
      bucketKey: 'RATELIMIT#abc#1',
      limit: 10,
      ttlEpochSeconds: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(result).toBe(false);
  });
});
