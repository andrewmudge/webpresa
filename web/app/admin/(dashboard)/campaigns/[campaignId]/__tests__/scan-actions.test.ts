/**
 * Unit tests for the campaign-wide "Run full scan" action (Stage 21
 * redesign) — loops the existing single-business `startScanWorkflow` over
 * every unique business in the campaign's recipient list.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetSession, mockGetBusinessById, mockListCampaignRecipientsForCampaign, mockStartScanWorkflow } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetBusinessById: vi.fn(),
  mockListCampaignRecipientsForCampaign: vi.fn(),
  mockStartScanWorkflow: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById }));
vi.mock('@/lib/db/campaign-recipients', () => ({ listCampaignRecipientsForCampaign: mockListCampaignRecipientsForCampaign }));
vi.mock('@/lib/workflow/run-scan-workflow', () => ({ startScanWorkflow: mockStartScanWorkflow }));

import { runCampaignScanAction } from '../scan-actions';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ sub: 'admin_1' });
  mockGetBusinessById.mockImplementation(async (businessId: string) => ({ businessId, name: `Business ${businessId}` }));
});

describe('runCampaignScanAction', () => {
  it('returns an empty summary for an unauthenticated request', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const summary = await runCampaignScanAction('campaign_1');
    expect(summary).toEqual({ started: 0, conflict: 0, failed: 0, results: [] });
    expect(mockStartScanWorkflow).not.toHaveBeenCalled();
  });

  it('starts a scan for every unique business among the recipients', async () => {
    mockListCampaignRecipientsForCampaign.mockResolvedValueOnce([
      { campaignRecipientId: 'recipient_1', businessId: 'biz_1' },
      { campaignRecipientId: 'recipient_2', businessId: 'biz_2' },
    ]);
    mockStartScanWorkflow.mockResolvedValue({ status: 'started', scanExecutionId: 'scanexec_1' });

    const summary = await runCampaignScanAction('campaign_1');

    expect(summary.started).toBe(2);
    expect(summary.conflict).toBe(0);
    expect(summary.failed).toBe(0);
    expect(mockStartScanWorkflow).toHaveBeenCalledWith('biz_1', 'admin_1');
    expect(mockStartScanWorkflow).toHaveBeenCalledWith('biz_2', 'admin_1');
  });

  it('dedupes recipients that share the same business', async () => {
    mockListCampaignRecipientsForCampaign.mockResolvedValueOnce([
      { campaignRecipientId: 'recipient_1', businessId: 'biz_1' },
      { campaignRecipientId: 'recipient_2', businessId: 'biz_1' },
    ]);
    mockStartScanWorkflow.mockResolvedValue({ status: 'started' });

    const summary = await runCampaignScanAction('campaign_1');

    expect(mockStartScanWorkflow).toHaveBeenCalledTimes(1);
    expect(summary.started).toBe(1);
  });

  it('aggregates conflict and failed outcomes separately', async () => {
    mockListCampaignRecipientsForCampaign.mockResolvedValueOnce([
      { campaignRecipientId: 'recipient_1', businessId: 'biz_1' },
      { campaignRecipientId: 'recipient_2', businessId: 'biz_2' },
      { campaignRecipientId: 'recipient_3', businessId: 'biz_3' },
    ]);
    mockStartScanWorkflow
      .mockResolvedValueOnce({ status: 'started' })
      .mockResolvedValueOnce({ status: 'conflict', message: 'A scan workflow for this business is already queued or running.' })
      .mockResolvedValueOnce({ status: 'failed', message: 'Failed to start the scan workflow.' });

    const summary = await runCampaignScanAction('campaign_1');

    expect(summary).toMatchObject({ started: 1, conflict: 1, failed: 1 });
    expect(summary.results).toHaveLength(3);
  });

  it('returns an empty summary when the campaign has no recipients', async () => {
    mockListCampaignRecipientsForCampaign.mockResolvedValueOnce([]);
    const summary = await runCampaignScanAction('campaign_1');
    expect(summary).toEqual({ started: 0, conflict: 0, failed: 0, results: [] });
    expect(mockStartScanWorkflow).not.toHaveBeenCalled();
  });
});
