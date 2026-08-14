/**
 * Unit tests for the Stage 24 Needs Attention dismissal repository.
 * All DynamoDB interactions are mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();

vi.mock('@/lib/db/client', () => ({
  getDynamoDBClient: () => ({ send: mockSend }),
  TABLE_OPERATIONS_DISMISSALS: () => 'webpresa-test-operations-dismissals',
}));

vi.mock('server-only', () => ({}));

import { dismissNeedsAttentionItem, listDismissedItemIds } from '@/lib/db/operations-dismissals';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dismissNeedsAttentionItem', () => {
  it('writes the item id with a dismissedBy/dismissedAt and a future TTL', async () => {
    mockSend.mockResolvedValueOnce({});
    const before = Math.floor(Date.now() / 1000);

    await dismissNeedsAttentionItem('scan:scan_1', 'admin');

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.TableName).toBe('webpresa-test-operations-dismissals');
    expect(command.input.Item.itemId).toBe('scan:scan_1');
    expect(command.input.Item.dismissedBy).toBe('admin');
    expect(typeof command.input.Item.dismissedAt).toBe('string');
    // ~30 days out, allowing generous slack for test execution time.
    expect(command.input.Item.ttl).toBeGreaterThan(before + 29 * 24 * 60 * 60);
    expect(command.input.Item.ttl).toBeLessThan(before + 31 * 24 * 60 * 60);
  });
});

describe('listDismissedItemIds', () => {
  it('returns an empty set when nothing is dismissed', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    const ids = await listDismissedItemIds();
    expect(ids.size).toBe(0);
  });

  it('returns the set of dismissed item ids', async () => {
    mockSend.mockResolvedValueOnce({ Items: [{ itemId: 'scan:scan_1' }, { itemId: 'postcard:postcard_1:submission' }] });
    const ids = await listDismissedItemIds();
    expect(ids).toEqual(new Set(['scan:scan_1', 'postcard:postcard_1:submission']));
  });

  it('pages through LastEvaluatedKey up to the safety cap', async () => {
    mockSend
      .mockResolvedValueOnce({ Items: [{ itemId: 'a' }], LastEvaluatedKey: { itemId: 'a' } })
      .mockResolvedValueOnce({ Items: [{ itemId: 'b' }] });

    const ids = await listDismissedItemIds();

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(ids).toEqual(new Set(['a', 'b']));
  });
});
