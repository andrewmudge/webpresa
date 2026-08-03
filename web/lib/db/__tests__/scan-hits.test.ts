/**
 * Unit tests for the ScanHits repository (Stage 21).
 * All DynamoDB interactions are mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

const mockSend = vi.fn();

vi.mock('@/lib/db/client', () => ({
  getDynamoDBClient: () => ({ send: mockSend }),
  TABLE_SCAN_HITS: () => 'webpresa-test-scan-hits',
}));

vi.mock('server-only', () => ({}));

import { putScanHit, listRecentScanHitsForRecipient, reserveVisitorFingerprint, deleteAllScanHitsForRecipient } from '@/lib/db/scan-hits';
import { createScanHit } from '@/domain/factories/scan-hit.factory';

function makeHit(overrides: Partial<ReturnType<typeof createScanHit>> = {}) {
  return {
    ...createScanHit({
      campaignRecipientId: 'recipient_00000000-0000-0000-0000-000000000001',
      campaignCode: 'AB23CD45EF67GH89',
      businessId: 'biz_00000000-0000-0000-0000-000000000001',
      destinationUrl: 'https://webpresa.com/b/acme-plumbing',
      visitorFingerprint: 'a'.repeat(64),
      userAgent: 'test-agent',
      deviceClass: 'desktop',
    }),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('putScanHit', () => {
  it('writes a valid record', async () => {
    mockSend.mockResolvedValueOnce({});
    await expect(putScanHit(makeHit())).resolves.toBeUndefined();
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid record before ever calling DynamoDB', async () => {
    const invalid = { ...makeHit(), businessId: 'not-prefixed' };
    await expect(putScanHit(invalid)).rejects.toThrow();
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('listRecentScanHitsForRecipient', () => {
  it('queries only HIT# items, newest first', async () => {
    mockSend.mockResolvedValueOnce({ Items: [makeHit()] });
    const result = await listRecentScanHitsForRecipient('recipient_1', 10);
    expect(result).toHaveLength(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.ExpressionAttributeValues[':prefix']).toBe('HIT#');
    expect(command.input.ScanIndexForward).toBe(false);
    expect(command.input.Limit).toBe(10);
  });
});

describe('reserveVisitorFingerprint', () => {
  it('returns true and writes a non-TTL FINGERPRINT# item on first reservation', async () => {
    mockSend.mockResolvedValueOnce({});
    const result = await reserveVisitorFingerprint('recipient_1', 'a'.repeat(64));
    expect(result).toBe(true);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.Item.sortKey).toBe(`FINGERPRINT#${'a'.repeat(64)}`);
    expect(command.input.Item.ttl).toBeUndefined();
    expect(command.input.ConditionExpression).toBe('attribute_not_exists(sortKey)');
  });

  it('returns false (never throws) when the fingerprint was already reserved', async () => {
    mockSend.mockRejectedValueOnce(new ConditionalCheckFailedException({ message: 'conditional check failed', $metadata: {} }));
    const result = await reserveVisitorFingerprint('recipient_1', 'a'.repeat(64));
    expect(result).toBe(false);
  });

  it('re-throws unrelated errors', async () => {
    mockSend.mockRejectedValueOnce(new Error('network blip'));
    await expect(reserveVisitorFingerprint('recipient_1', 'a'.repeat(64))).rejects.toThrow('network blip');
  });
});

describe('deleteAllScanHitsForRecipient', () => {
  it('deletes every item found for the recipient, across pages', async () => {
    mockSend
      // page 1: Query
      .mockResolvedValueOnce({
        Items: [
          { campaignRecipientId: 'recipient_1', sortKey: 'HIT#a' },
          { campaignRecipientId: 'recipient_1', sortKey: 'FINGERPRINT#b' },
        ],
        LastEvaluatedKey: { campaignRecipientId: 'recipient_1', sortKey: 'FINGERPRINT#b' },
      })
      // page 1 deletes
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      // page 2: Query
      .mockResolvedValueOnce({
        Items: [{ campaignRecipientId: 'recipient_1', sortKey: 'HIT#c' }],
      })
      // page 2 delete
      .mockResolvedValueOnce({});

    await deleteAllScanHitsForRecipient('recipient_1');

    const deleteCalls = mockSend.mock.calls.filter((call) => call[0].constructor.name === 'DeleteCommand');
    expect(deleteCalls).toHaveLength(3);
  });

  it('does nothing when the recipient has no items', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    await deleteAllScanHitsForRecipient('recipient_empty');
    expect(mockSend).toHaveBeenCalledTimes(1); // only the Query, no Deletes
  });
});
