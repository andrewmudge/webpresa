/**
 * Unit tests for the CustomerBillingProfile repository (Stage 18).
 * All DynamoDB interactions are mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

const mockSend = vi.fn();

vi.mock('@/lib/db/client', () => ({
  getDynamoDBClient: () => ({ send: mockSend }),
  TABLE_CUSTOMER_BILLING_PROFILES: () => 'webpresa-test-customer-billing-profiles',
}));

vi.mock('server-only', () => ({}));

import { getCustomerBillingProfile, createCustomerBillingProfile } from '@/lib/db/customer-billing';

beforeEach(() => {
  mockSend.mockReset();
});

describe('getCustomerBillingProfile', () => {
  it('returns null when no profile exists', async () => {
    mockSend.mockResolvedValueOnce({});
    const result = await getCustomerBillingProfile('user_1');
    expect(result).toBeNull();
  });

  it('returns the parsed profile when found', async () => {
    const now = new Date().toISOString();
    mockSend.mockResolvedValueOnce({
      Item: { userId: 'user_1', stripeCustomerId: 'cus_123', createdAt: now, updatedAt: now },
    });
    const result = await getCustomerBillingProfile('user_1');
    expect(result).toEqual({ userId: 'user_1', stripeCustomerId: 'cus_123', createdAt: now, updatedAt: now });
  });
});

describe('createCustomerBillingProfile', () => {
  it('creates a new profile when none exists', async () => {
    mockSend.mockResolvedValueOnce({}); // PutCommand succeeds
    const result = await createCustomerBillingProfile('user_1', 'cus_123');
    expect(result.outcome).toBe('created');
    expect(result.profile.stripeCustomerId).toBe('cus_123');

    const putArg = mockSend.mock.calls[0][0].input;
    expect(putArg.ConditionExpression).toBe('attribute_not_exists(userId)');
  });

  it('on a lost race, re-reads and returns the winning row instead of throwing', async () => {
    const now = new Date().toISOString();
    mockSend.mockRejectedValueOnce(
      new ConditionalCheckFailedException({ message: 'conditional check failed', $metadata: {} }),
    );
    mockSend.mockResolvedValueOnce({
      Item: { userId: 'user_1', stripeCustomerId: 'cus_winner', createdAt: now, updatedAt: now },
    });

    const result = await createCustomerBillingProfile('user_1', 'cus_loser');

    expect(result.outcome).toBe('already_exists');
    expect(result.profile.stripeCustomerId).toBe('cus_winner');
  });

  it('rethrows unexpected errors', async () => {
    mockSend.mockRejectedValueOnce(new Error('boom'));
    await expect(createCustomerBillingProfile('user_1', 'cus_123')).rejects.toThrow('boom');
  });
});
