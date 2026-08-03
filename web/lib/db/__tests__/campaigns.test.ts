/**
 * Unit tests for the Campaigns repository (Stage 21).
 * All DynamoDB interactions are mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();

vi.mock('@/lib/db/client', () => ({
  getDynamoDBClient: () => ({ send: mockSend }),
  TABLE_CAMPAIGNS: () => 'webpresa-test-campaigns',
}));

vi.mock('server-only', () => ({}));

import { getCampaignById, listAllCampaigns, putCampaign, updateCampaignStatus } from '@/lib/db/campaigns';
import { createCampaign } from '@/domain/factories/campaign.factory';

function makeCampaign(overrides: Partial<ReturnType<typeof createCampaign>> = {}) {
  return { ...createCampaign({ name: 'Spring drop', channel: 'postcard' }), ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getCampaignById', () => {
  it('returns a parsed Campaign when the item exists', async () => {
    const campaign = makeCampaign();
    mockSend.mockResolvedValueOnce({ Item: campaign });
    const result = await getCampaignById(campaign.campaignId);
    expect(result?.campaignId).toBe(campaign.campaignId);
  });

  it('returns null when the item does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });
    expect(await getCampaignById('campaign_missing')).toBeNull();
  });
});

describe('listAllCampaigns', () => {
  it('returns every campaign, newest first', async () => {
    const older = makeCampaign({ createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' });
    const newer = makeCampaign({ createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' });
    mockSend.mockResolvedValueOnce({ Items: [older, newer] });
    const result = await listAllCampaigns();
    expect(result.map((c) => c.campaignId)).toEqual([newer.campaignId, older.campaignId]);
  });

  it('pages through Scan results', async () => {
    const a = makeCampaign();
    const b = makeCampaign();
    mockSend
      .mockResolvedValueOnce({ Items: [a], LastEvaluatedKey: { campaignId: a.campaignId } })
      .mockResolvedValueOnce({ Items: [b] });
    const result = await listAllCampaigns();
    expect(result).toHaveLength(2);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});

describe('putCampaign', () => {
  it('writes a valid record', async () => {
    mockSend.mockResolvedValueOnce({});
    await expect(putCampaign(makeCampaign())).resolves.toBeUndefined();
  });

  it('rejects an invalid record before ever calling DynamoDB', async () => {
    const invalid = { ...makeCampaign(), status: 'not-a-real-status' } as unknown as ReturnType<typeof createCampaign>;
    await expect(putCampaign(invalid)).rejects.toThrow();
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('updateCampaignStatus', () => {
  it('sets the new status', async () => {
    mockSend.mockResolvedValueOnce({});
    await updateCampaignStatus('campaign_1', 'paused');
    const command = mockSend.mock.calls[0][0];
    expect(command.input.ExpressionAttributeValues[':status']).toBe('paused');
  });
});
