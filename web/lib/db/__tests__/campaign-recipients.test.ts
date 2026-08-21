/**
 * Unit tests for the CampaignRecipients repository (Stage 21).
 * All DynamoDB interactions are mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();

vi.mock('@/lib/db/client', () => ({
  getDynamoDBClient: () => ({ send: mockSend }),
  TABLE_CAMPAIGN_RECIPIENTS: () => 'webpresa-test-campaign-recipients',
}));

vi.mock('server-only', () => ({}));

import {
  getCampaignRecipientById,
  getCampaignRecipientByCode,
  listCampaignRecipientsForCampaign,
  listCampaignRecipientsForBusiness,
  listCampaignRecipientsByIds,
  putCampaignRecipient,
  updateCampaignRecipientDestination,
  updateCampaignRecipientStatus,
  recordScanHitRollup,
  deleteCampaignRecipientById,
  buildRateLimitKey,
  checkAndIncrementRateLimit,
} from '@/lib/db/campaign-recipients';
import { createCampaignRecipient } from '@/domain/factories/campaign-recipient.factory';

function makeRecipient(overrides: Partial<ReturnType<typeof createCampaignRecipient>> = {}) {
  return {
    ...createCampaignRecipient({
      campaignId: 'campaign_00000000-0000-0000-0000-000000000001',
      businessId: 'biz_00000000-0000-0000-0000-000000000001',
      campaignCode: 'AB23CD45EF67GH89',
      destinationType: 'custom',
      destinationUrl: 'https://webpresa.com/b/acme-plumbing',
    }),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getCampaignRecipientById', () => {
  it('returns a parsed CampaignRecipient when the item exists', async () => {
    const recipient = makeRecipient();
    mockSend.mockResolvedValueOnce({ Item: recipient });
    const result = await getCampaignRecipientById(recipient.campaignRecipientId);
    expect(result?.campaignRecipientId).toBe(recipient.campaignRecipientId);
  });

  it('returns null when the item does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });
    expect(await getCampaignRecipientById('recipient_missing')).toBeNull();
  });
});

describe('getCampaignRecipientByCode', () => {
  it('queries the campaign-code-index and returns the first match', async () => {
    const recipient = makeRecipient();
    mockSend.mockResolvedValueOnce({ Items: [recipient] });
    const result = await getCampaignRecipientByCode(recipient.campaignCode);
    expect(result?.campaignCode).toBe(recipient.campaignCode);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.IndexName).toBe('campaign-code-index');
  });

  it('returns null when no recipient matches the code', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    expect(await getCampaignRecipientByCode('NOSUCHCODE000000')).toBeNull();
  });
});

describe('listCampaignRecipientsForCampaign', () => {
  it('queries campaign-id-index, newest first', async () => {
    mockSend.mockResolvedValueOnce({ Items: [makeRecipient()] });
    const result = await listCampaignRecipientsForCampaign('campaign_00000000-0000-0000-0000-000000000001');
    expect(result).toHaveLength(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.IndexName).toBe('campaign-id-index');
    expect(command.input.ScanIndexForward).toBe(false);
  });
});

describe('listCampaignRecipientsForBusiness', () => {
  it('queries business-id-index', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    await listCampaignRecipientsForBusiness('biz_00000000-0000-0000-0000-000000000001');
    const command = mockSend.mock.calls[0][0];
    expect(command.input.IndexName).toBe('business-id-index');
  });
});

describe('listCampaignRecipientsByIds', () => {
  it('returns an empty array without calling DynamoDB for an empty input', async () => {
    const result = await listCampaignRecipientsByIds([]);
    expect(result).toEqual([]);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('batch-gets and parses every requested recipient in a single chunk', async () => {
    const r1 = makeRecipient();
    const r2 = makeRecipient({ campaignRecipientId: 'recipient_00000000-0000-0000-0000-000000000002' });
    mockSend.mockResolvedValueOnce({
      Responses: { 'webpresa-test-campaign-recipients': [r1, r2] },
    });

    const result = await listCampaignRecipientsByIds([r1.campaignRecipientId, r2.campaignRecipientId]);

    expect(result).toHaveLength(2);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.RequestItems['webpresa-test-campaign-recipients'].Keys).toEqual([
      { campaignRecipientId: r1.campaignRecipientId },
      { campaignRecipientId: r2.campaignRecipientId },
    ]);
  });

  it('dedupes duplicate ids before batch-getting', async () => {
    const r1 = makeRecipient();
    mockSend.mockResolvedValueOnce({
      Responses: { 'webpresa-test-campaign-recipients': [r1] },
    });

    await listCampaignRecipientsByIds([r1.campaignRecipientId, r1.campaignRecipientId]);

    const command = mockSend.mock.calls[0][0];
    expect(command.input.RequestItems['webpresa-test-campaign-recipients'].Keys).toHaveLength(1);
  });

  it('chunks requests at the 100-item BatchGetItem limit', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `recipient_${String(i).padStart(8, '0')}-0000-0000-0000-000000000000`);
    mockSend.mockResolvedValue({ Responses: { 'webpresa-test-campaign-recipients': [] } });

    await listCampaignRecipientsByIds(ids);

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend.mock.calls[0][0].input.RequestItems['webpresa-test-campaign-recipients'].Keys).toHaveLength(100);
    expect(mockSend.mock.calls[1][0].input.RequestItems['webpresa-test-campaign-recipients'].Keys).toHaveLength(50);
  });

  it('retries once on UnprocessedKeys, then gives up on any still left', async () => {
    const r1 = makeRecipient();
    mockSend
      .mockResolvedValueOnce({
        Responses: { 'webpresa-test-campaign-recipients': [] },
        UnprocessedKeys: {
          'webpresa-test-campaign-recipients': { Keys: [{ campaignRecipientId: r1.campaignRecipientId }] },
        },
      })
      .mockResolvedValueOnce({
        Responses: { 'webpresa-test-campaign-recipients': [r1] },
      });

    const result = await listCampaignRecipientsByIds([r1.campaignRecipientId]);

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
  });
});

describe('putCampaignRecipient', () => {
  it('writes a valid record', async () => {
    mockSend.mockResolvedValueOnce({});
    await expect(putCampaignRecipient(makeRecipient())).resolves.toBeUndefined();
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid record before ever calling DynamoDB', async () => {
    const invalid = { ...makeRecipient(), campaignCode: 'too-short' };
    await expect(putCampaignRecipient(invalid)).rejects.toThrow();
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('updateCampaignRecipientDestination', () => {
  it('SETs destinationType to custom and destinationLabel when provided, and always clears claimId', async () => {
    mockSend.mockResolvedValueOnce({});
    await updateCampaignRecipientDestination('recipient_1', {
      destinationUrl: 'https://webpresa.com/b/new-slug',
      destinationLabel: 'preview',
    });
    const command = mockSend.mock.calls[0][0];
    expect(command.input.UpdateExpression).toContain('destinationType = :custom');
    expect(command.input.UpdateExpression).toContain('destinationLabel = :destinationLabel');
    expect(command.input.UpdateExpression).toContain('REMOVE claimId');
  });

  it('REMOVEs destinationLabel (and claimId) when destinationLabel is omitted', async () => {
    mockSend.mockResolvedValueOnce({});
    await updateCampaignRecipientDestination('recipient_1', { destinationUrl: 'https://webpresa.com/b/new-slug' });
    const command = mockSend.mock.calls[0][0];
    expect(command.input.UpdateExpression).toContain('REMOVE claimId, destinationLabel');
  });
});

describe('updateCampaignRecipientStatus', () => {
  it('sets the new status', async () => {
    mockSend.mockResolvedValueOnce({});
    await updateCampaignRecipientStatus('recipient_1', 'disabled');
    const command = mockSend.mock.calls[0][0];
    expect(command.input.ExpressionAttributeValues[':status']).toBe('disabled');
  });
});

describe('recordScanHitRollup', () => {
  it('always increments totalScans, and increments estimatedUniqueScans only for a new visitor', async () => {
    mockSend.mockResolvedValueOnce({});
    await recordScanHitRollup({ campaignRecipientId: 'recipient_1', isNewUniqueVisitor: true });
    let command = mockSend.mock.calls[0][0];
    expect(command.input.ExpressionAttributeValues[':uniqueIncr']).toBe(1);

    mockSend.mockResolvedValueOnce({});
    await recordScanHitRollup({ campaignRecipientId: 'recipient_1', isNewUniqueVisitor: false });
    command = mockSend.mock.calls[1][0];
    expect(command.input.ExpressionAttributeValues[':uniqueIncr']).toBe(0);
  });
});

describe('deleteCampaignRecipientById', () => {
  it('deletes by campaignRecipientId', async () => {
    mockSend.mockResolvedValueOnce({});
    await deleteCampaignRecipientById('recipient_1');
    const command = mockSend.mock.calls[0][0];
    expect(command.input.Key).toEqual({ campaignRecipientId: 'recipient_1' });
  });
});

describe('rate limiting', () => {
  it('buildRateLimitKey builds a RATELIMIT#<ipHash>#<windowBucket> key', () => {
    expect(buildRateLimitKey('abc123', '999')).toBe('RATELIMIT#abc123#999');
  });

  it('checkAndIncrementRateLimit targets the campaign-recipients table and partition key', async () => {
    mockSend.mockResolvedValueOnce({});
    await checkAndIncrementRateLimit({
      bucketKey: 'RATELIMIT#abc#1',
      limit: 30,
      ttlEpochSeconds: Math.floor(Date.now() / 1000) + 3600,
    });
    const command = mockSend.mock.calls[0][0];
    expect(command.input.TableName).toBe('webpresa-test-campaign-recipients');
    expect(command.input.Key).toEqual({ campaignRecipientId: 'RATELIMIT#abc#1' });
  });
});
