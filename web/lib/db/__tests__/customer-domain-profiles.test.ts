/**
 * Unit tests for the CustomerDomainProfile repository (OpenSRS Storefront
 * integration). All DynamoDB interactions are mocked — no real AWS calls.
 * Mirrors `customer-billing.test.ts` exactly — same conditional-write /
 * lost-race shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

const mockSend = vi.fn();

vi.mock('@/lib/db/client', () => ({
  getDynamoDBClient: () => ({ send: mockSend }),
  TABLE_CUSTOMER_DOMAIN_PROFILES: () => 'webpresa-test-customer-domain-profiles',
}));

vi.mock('server-only', () => ({}));

import { getCustomerDomainProfile, createCustomerDomainProfile } from '@/lib/db/customer-domain-profiles';

beforeEach(() => {
  mockSend.mockReset();
});

describe('getCustomerDomainProfile', () => {
  it('returns null when no profile exists', async () => {
    mockSend.mockResolvedValueOnce({});
    const result = await getCustomerDomainProfile('user_1');
    expect(result).toBeNull();
  });

  it('returns the parsed profile when found', async () => {
    const now = new Date().toISOString();
    mockSend.mockResolvedValueOnce({
      Item: { userId: 'user_1', opensrsCustomerId: 'osrs_123', createdAt: now, updatedAt: now },
    });
    const result = await getCustomerDomainProfile('user_1');
    expect(result).toEqual({ userId: 'user_1', opensrsCustomerId: 'osrs_123', createdAt: now, updatedAt: now });
  });
});

describe('createCustomerDomainProfile', () => {
  it('creates a new profile when none exists', async () => {
    mockSend.mockResolvedValueOnce({}); // PutCommand succeeds
    const result = await createCustomerDomainProfile('user_1', 'osrs_123');
    expect(result.outcome).toBe('created');
    expect(result.profile.opensrsCustomerId).toBe('osrs_123');

    const putArg = mockSend.mock.calls[0][0].input;
    expect(putArg.ConditionExpression).toBe('attribute_not_exists(userId)');
  });

  it('on a lost race, re-reads and returns the winning row instead of throwing', async () => {
    const now = new Date().toISOString();
    mockSend.mockRejectedValueOnce(
      new ConditionalCheckFailedException({ message: 'conditional check failed', $metadata: {} }),
    );
    mockSend.mockResolvedValueOnce({
      Item: { userId: 'user_1', opensrsCustomerId: 'osrs_winner', createdAt: now, updatedAt: now },
    });

    const result = await createCustomerDomainProfile('user_1', 'osrs_loser');

    expect(result.outcome).toBe('already_exists');
    expect(result.profile.opensrsCustomerId).toBe('osrs_winner');
  });

  it('rethrows unexpected errors', async () => {
    mockSend.mockRejectedValueOnce(new Error('boom'));
    await expect(createCustomerDomainProfile('user_1', 'osrs_123')).rejects.toThrow('boom');
  });
});
