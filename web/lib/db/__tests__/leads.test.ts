/**
 * Unit tests for the Leads repository (Stage 20).
 * All DynamoDB interactions are mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

const mockSend = vi.fn();

vi.mock('@/lib/db/client', () => ({
  getDynamoDBClient: () => ({ send: mockSend }),
  TABLE_LEADS: () => 'webpresa-test-leads',
}));

vi.mock('server-only', () => ({}));

import {
  getLeadById,
  listLeadsForBusiness,
  listLeadsNeedingNotificationRetry,
  putLead,
  updateLeadStatus,
  updateLeadNotificationOutcome,
  deleteLeadById,
  buildLeadRateLimitKey,
  checkAndIncrementLeadRateLimit,
  reserveLeadFingerprint,
} from '@/lib/db/leads';
import { createLead } from '@/domain/factories/lead.factory';

function makeLead(overrides: Partial<ReturnType<typeof createLead>> = {}) {
  return {
    ...createLead({
      businessId: 'biz_00000000-0000-0000-0000-000000000001',
      name: 'Jane Smith',
      email: 'jane@example.com',
      submitterIpHash: 'a'.repeat(64),
      fingerprint: 'b'.repeat(64),
    }),
    ...overrides,
  };
}

beforeEach(() => {
  mockSend.mockReset();
});

describe('getLeadById', () => {
  it('returns a parsed Lead when the item exists', async () => {
    const lead = makeLead();
    mockSend.mockResolvedValueOnce({ Item: lead });
    const result = await getLeadById(lead.leadId);
    expect(result?.leadId).toBe(lead.leadId);
  });

  it('returns null when the item does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });
    expect(await getLeadById('lead_missing')).toBeNull();
  });
});

describe('listLeadsForBusiness', () => {
  it('queries business-id-index, newest first', async () => {
    const lead = makeLead();
    mockSend.mockResolvedValueOnce({ Items: [lead] });
    const result = await listLeadsForBusiness(lead.businessId);
    expect(result).toHaveLength(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.IndexName).toBe('business-id-index');
    expect(command.input.ScanIndexForward).toBe(false);
  });
});

describe('listLeadsNeedingNotificationRetry', () => {
  it('filters on notificationStatus and attempts remaining, excluding non-Lead item shapes via attribute_exists(businessId)', async () => {
    const lead = makeLead({ notificationStatus: 'failed' });
    mockSend.mockResolvedValueOnce({ Items: [lead], LastEvaluatedKey: undefined });
    const result = await listLeadsNeedingNotificationRetry(5);
    expect(result).toHaveLength(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.FilterExpression).toContain('attribute_exists(businessId)');
    expect(command.input.ExpressionAttributeValues[':maxAttempts']).toBe(5);
  });

  it('pages through ExclusiveStartKey until exhausted', async () => {
    const lead = makeLead({ notificationStatus: 'pending' });
    mockSend
      .mockResolvedValueOnce({ Items: [lead], LastEvaluatedKey: { leadId: lead.leadId } })
      .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined });
    const result = await listLeadsNeedingNotificationRetry(5);
    expect(result).toHaveLength(1);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});

describe('putLead', () => {
  it('validates and writes the lead', async () => {
    const lead = makeLead();
    mockSend.mockResolvedValueOnce({});
    await putLead(lead);
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('throws on an invalid lead rather than writing it', async () => {
    const lead = makeLead();
    await expect(putLead({ ...lead, submitterIpHash: 'not-a-hash' })).rejects.toThrow();
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('updateLeadStatus', () => {
  it('sets archivedAt only when transitioning to archived', async () => {
    mockSend.mockResolvedValueOnce({});
    await updateLeadStatus('lead_1', 'archived');
    const command = mockSend.mock.calls[0][0];
    expect(command.input.UpdateExpression).toContain('archivedAt = :now');
  });

  it('does not set archivedAt when transitioning to read', async () => {
    mockSend.mockResolvedValueOnce({});
    await updateLeadStatus('lead_1', 'read');
    const command = mockSend.mock.calls[0][0];
    expect(command.input.UpdateExpression).not.toContain('archivedAt');
  });
});

describe('updateLeadNotificationOutcome', () => {
  it('increments notificationAttempts and records an error message on failure', async () => {
    mockSend.mockResolvedValueOnce({});
    await updateLeadNotificationOutcome('lead_1', { status: 'failed', error: 'MessageRejected' });
    const command = mockSend.mock.calls[0][0];
    expect(command.input.UpdateExpression).toContain('notificationAttempts = if_not_exists(notificationAttempts, :zero) + :one');
    expect(command.input.ExpressionAttributeValues[':error']).toBe('MessageRejected');
  });

  it('removes any stale error on success', async () => {
    mockSend.mockResolvedValueOnce({});
    await updateLeadNotificationOutcome('lead_1', { status: 'sent' });
    const command = mockSend.mock.calls[0][0];
    expect(command.input.UpdateExpression).toContain('REMOVE lastNotificationError');
  });
});

describe('deleteLeadById', () => {
  it('sends a DeleteCommand for the given leadId', async () => {
    mockSend.mockResolvedValueOnce({});
    await deleteLeadById('lead_1');
    const command = mockSend.mock.calls[0][0];
    expect(command.input.Key).toEqual({ leadId: 'lead_1' });
  });
});

describe('rate limiting — delegates to the shared table-agnostic helper', () => {
  it('buildLeadRateLimitKey matches the RATELIMIT#<scope>#<windowBucket> shape', () => {
    expect(buildLeadRateLimitKey('ip#abc', '12345')).toBe('RATELIMIT#ip#abc#12345');
  });

  it('checkAndIncrementLeadRateLimit succeeds under the limit', async () => {
    mockSend.mockResolvedValueOnce({});
    const result = await checkAndIncrementLeadRateLimit({ bucketKey: 'RATELIMIT#ip#abc#1', limit: 5, ttlEpochSeconds: 1 });
    expect(result).toBe(true);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.TableName).toBe('webpresa-test-leads');
    expect(command.input.Key).toEqual({ leadId: 'RATELIMIT#ip#abc#1' });
  });

  it('checkAndIncrementLeadRateLimit returns false (never throws) once the window limit is reached', async () => {
    mockSend.mockRejectedValueOnce(new ConditionalCheckFailedException({ message: 'conditional check failed', $metadata: {} }));
    const result = await checkAndIncrementLeadRateLimit({ bucketKey: 'RATELIMIT#ip#abc#1', limit: 5, ttlEpochSeconds: 1 });
    expect(result).toBe(false);
  });
});

describe('reserveLeadFingerprint', () => {
  it('returns true on the first reservation — a conditional PutItem keyed on the leads table PK', async () => {
    mockSend.mockResolvedValueOnce({});
    const result = await reserveLeadFingerprint('c'.repeat(64), 1);
    expect(result).toBe(true);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.Item.leadId).toBe(`FINGERPRINT#${'c'.repeat(64)}`);
    expect(command.input.ConditionExpression).toBe('attribute_not_exists(leadId)');
  });

  it('returns false (never throws) when the fingerprint was already reserved', async () => {
    mockSend.mockRejectedValueOnce(new ConditionalCheckFailedException({ message: 'conditional check failed', $metadata: {} }));
    const result = await reserveLeadFingerprint('c'.repeat(64), 1);
    expect(result).toBe(false);
  });
});
