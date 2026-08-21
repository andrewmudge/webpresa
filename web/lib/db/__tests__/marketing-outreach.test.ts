/**
 * Unit tests for the MarketingOutreach repository — the enroll-once
 * conditional write and the manual-control conditional transitions are the
 * load-bearing idempotency behaviors to verify. All DynamoDB interactions
 * are mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

const mockSend = vi.fn();

vi.mock('@/lib/db/client', () => ({
  getDynamoDBClient: () => ({ send: mockSend }),
  TABLE_MARKETING_OUTREACH: () => 'webpresa-test-marketing-outreach',
}));

vi.mock('server-only', () => ({}));

import {
  putMarketingOutreachIfNotExists,
  pauseOutreach,
  resumeOutreach,
  suppressOutreachManually,
  cancelRemainingOutreach,
  recordOutreachSendSucceeded,
  recordOutreachSendFailed,
} from '@/lib/db/marketing-outreach';
import { createMarketingOutreach } from '@/domain/factories/marketing-outreach.factory';

const conditionalCheckFailed = new ConditionalCheckFailedException({ message: 'conditional check failed', $metadata: {} });

function makeOutreach() {
  return createMarketingOutreach({
    businessId: 'biz_00000000-0000-0000-0000-000000000001',
    marketingCampaignId: 'mktgcampaign_postcard_followup',
    postcardId: 'postcard_00000000-0000-0000-0000-000000000001',
    campaignRecipientId: 'recipient_00000000-0000-0000-0000-000000000001',
    deliveredAt: '2026-08-10T14:30:00.000Z',
    nextActionAt: '2026-08-11T14:30:00.000Z',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('putMarketingOutreachIfNotExists — enroll-once guard', () => {
  it('returns true on first enrollment', async () => {
    mockSend.mockResolvedValueOnce({});
    expect(await putMarketingOutreachIfNotExists(makeOutreach())).toBe(true);
  });

  it('returns false (never throws) when the business is already enrolled in this campaign', async () => {
    mockSend.mockRejectedValueOnce(conditionalCheckFailed);
    expect(await putMarketingOutreachIfNotExists(makeOutreach())).toBe(false);
  });

  it('re-throws a genuine (non-conditional) DynamoDB error', async () => {
    mockSend.mockRejectedValueOnce(new Error('DynamoDB unavailable'));
    await expect(putMarketingOutreachIfNotExists(makeOutreach())).rejects.toThrow('DynamoDB unavailable');
  });
});

describe('manual admin controls — conditional transitions', () => {
  it('pauseOutreach succeeds from active', async () => {
    mockSend.mockResolvedValueOnce({});
    expect(await pauseOutreach('biz_1', 'mktgcampaign_postcard_followup')).toBe(true);
  });

  it('pauseOutreach returns false (no-op) when not currently active', async () => {
    mockSend.mockRejectedValueOnce(conditionalCheckFailed);
    expect(await pauseOutreach('biz_1', 'mktgcampaign_postcard_followup')).toBe(false);
  });

  it('resumeOutreach succeeds from paused and sets nextActionAt to now', async () => {
    mockSend.mockResolvedValueOnce({});
    expect(await resumeOutreach('biz_1', 'mktgcampaign_postcard_followup')).toBe(true);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.ExpressionAttributeValues[':active']).toBe('active');
    expect(typeof command.input.ExpressionAttributeValues[':now']).toBe('string');
  });

  it('resumeOutreach returns false when not currently paused', async () => {
    mockSend.mockRejectedValueOnce(conditionalCheckFailed);
    expect(await resumeOutreach('biz_1', 'mktgcampaign_postcard_followup')).toBe(false);
  });

  it('suppressOutreachManually succeeds from active or paused', async () => {
    mockSend.mockResolvedValueOnce({});
    expect(await suppressOutreachManually('biz_1', 'mktgcampaign_postcard_followup')).toBe(true);
  });

  it('cancelRemainingOutreach succeeds from active or paused', async () => {
    mockSend.mockResolvedValueOnce({});
    expect(await cancelRemainingOutreach('biz_1', 'mktgcampaign_postcard_followup')).toBe(true);
  });

  it('cancelRemainingOutreach returns false once already terminal (e.g. completed)', async () => {
    mockSend.mockRejectedValueOnce(conditionalCheckFailed);
    expect(await cancelRemainingOutreach('biz_1', 'mktgcampaign_postcard_followup')).toBe(false);
  });
});

describe('recordOutreachSendSucceeded', () => {
  it('advances to the next step when one is provided', async () => {
    mockSend.mockResolvedValueOnce({});
    await recordOutreachSendSucceeded({
      businessId: 'biz_1',
      marketingCampaignId: 'mktgcampaign_postcard_followup',
      sentSequence: 1,
      next: { nextActionSequence: 2, nextActionAt: '2026-08-14T14:30:00.000Z' },
    });
    const command = mockSend.mock.calls[0][0];
    expect(command.input.ExpressionAttributeValues[':nextActionSequence']).toBe(2);
    expect(command.input.ExpressionAttributeValues[':nextActionAt']).toBe('2026-08-14T14:30:00.000Z');
    expect(command.input.ExpressionAttributeValues[':zero']).toBe(0); // sendAttemptCount reset
  });

  it('completes the outreach and removes nextActionAt when there is no next step (sequence 3)', async () => {
    mockSend.mockResolvedValueOnce({});
    await recordOutreachSendSucceeded({ businessId: 'biz_1', marketingCampaignId: 'mktgcampaign_postcard_followup', sentSequence: 3 });
    const command = mockSend.mock.calls[0][0];
    expect(command.input.UpdateExpression).toContain('REMOVE nextActionAt, nextActionSequence');
    expect(command.input.ExpressionAttributeValues[':completed']).toBe('completed');
  });
});

describe('recordOutreachSendFailed', () => {
  it('reschedules the same step with a backoff when a retryAt is provided', async () => {
    mockSend.mockResolvedValueOnce({});
    await recordOutreachSendFailed({ businessId: 'biz_1', marketingCampaignId: 'mktgcampaign_postcard_followup', retryAt: '2026-08-11T20:30:00.000Z' });
    const command = mockSend.mock.calls[0][0];
    expect(command.input.ExpressionAttributeValues[':retryAt']).toBe('2026-08-11T20:30:00.000Z');
  });

  it('gives up (status: failed, nextActionAt removed) once the retry limit is exhausted', async () => {
    mockSend.mockResolvedValueOnce({});
    await recordOutreachSendFailed({ businessId: 'biz_1', marketingCampaignId: 'mktgcampaign_postcard_followup' });
    const command = mockSend.mock.calls[0][0];
    expect(command.input.ExpressionAttributeValues[':failed']).toBe('failed');
    expect(command.input.UpdateExpression).toContain('REMOVE nextActionAt');
  });
});
