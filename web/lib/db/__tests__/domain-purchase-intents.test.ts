/**
 * Unit tests for the DomainPurchaseIntent repository (OpenSRS Storefront
 * integration). All DynamoDB interactions are mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();

vi.mock('@/lib/db/client', () => ({
  getDynamoDBClient: () => ({ send: mockSend }),
  TABLE_DOMAIN_PURCHASE_INTENTS: () => 'webpresa-test-domain-purchase-intents',
}));

vi.mock('server-only', () => ({}));

import { getDomainPurchaseIntent, putDomainPurchaseIntent, listDomainPurchaseIntentsByStorefrontUsername } from '@/lib/db/domain-purchase-intents';

const USERNAME = 'wpabc123def456';

beforeEach(() => {
  mockSend.mockReset();
});

describe('getDomainPurchaseIntent', () => {
  it('returns null when no intent exists', async () => {
    mockSend.mockResolvedValueOnce({});
    const result = await getDomainPurchaseIntent('dpi_1');
    expect(result).toBeNull();
  });

  it('returns the parsed intent when found', async () => {
    const item = { intentId: 'dpi_1', businessId: 'biz_1', userId: 'user_1', storefrontUsername: USERNAME, status: 'pending', ttl: 9999999999, createdAt: '2026-08-27T00:00:00.000Z' };
    mockSend.mockResolvedValueOnce({ Item: item });
    const result = await getDomainPurchaseIntent('dpi_1');
    expect(result).toEqual(item);
  });
});

describe('putDomainPurchaseIntent', () => {
  it('sends a PutCommand with the full record', async () => {
    mockSend.mockResolvedValueOnce({});
    const record = { intentId: 'dpi_1', businessId: 'biz_1', userId: 'user_1', storefrontUsername: USERNAME, status: 'fulfilled' as const, ttl: 9999999999, createdAt: '2026-08-27T00:00:00.000Z' };
    await putDomainPurchaseIntent(record);
    const putArg = mockSend.mock.calls[0][0].input;
    expect(putArg.Item).toEqual(record);
  });
});

describe('listDomainPurchaseIntentsByStorefrontUsername', () => {
  it('queries the storefront-username-index, newest first', async () => {
    const items = [{ intentId: 'dpi_2', businessId: 'biz_1', userId: 'user_1', storefrontUsername: USERNAME, status: 'pending', ttl: 9999999999, createdAt: '2026-08-28T00:00:00.000Z' }];
    mockSend.mockResolvedValueOnce({ Items: items });

    const result = await listDomainPurchaseIntentsByStorefrontUsername(USERNAME);

    expect(result).toEqual(items);
    const queryArg = mockSend.mock.calls[0][0].input;
    expect(queryArg.IndexName).toBe('storefront-username-index');
    expect(queryArg.ExpressionAttributeValues).toEqual({ ':storefrontUsername': USERNAME });
    expect(queryArg.ScanIndexForward).toBe(false);
  });

  it('returns an empty array when nothing matches', async () => {
    mockSend.mockResolvedValueOnce({});
    const result = await listDomainPurchaseIntentsByStorefrontUsername(USERNAME);
    expect(result).toEqual([]);
  });
});
