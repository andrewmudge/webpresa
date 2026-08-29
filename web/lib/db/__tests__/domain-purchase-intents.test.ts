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

import { getDomainPurchaseIntent, putDomainPurchaseIntent } from '@/lib/db/domain-purchase-intents';

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
    const item = { intentId: 'dpi_1', businessId: 'biz_1', userId: 'user_1', status: 'pending', ttl: 9999999999, createdAt: '2026-08-27T00:00:00.000Z' };
    mockSend.mockResolvedValueOnce({ Item: item });
    const result = await getDomainPurchaseIntent('dpi_1');
    expect(result).toEqual(item);
  });
});

describe('putDomainPurchaseIntent', () => {
  it('sends a PutCommand with the full record', async () => {
    mockSend.mockResolvedValueOnce({});
    const record = { intentId: 'dpi_1', businessId: 'biz_1', userId: 'user_1', status: 'fulfilled' as const, ttl: 9999999999, createdAt: '2026-08-27T00:00:00.000Z' };
    await putDomainPurchaseIntent(record);
    const putArg = mockSend.mock.calls[0][0].input;
    expect(putArg.Item).toEqual(record);
  });
});
