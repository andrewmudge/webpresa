/**
 * Unit tests for the bulk "Add Selected Businesses" publish + generate
 * postcard action (Stage 21 redesign). All lib calls and the existing
 * `createPostcardAction` are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetSession,
  mockGetBusinessById,
  mockUpdateBusiness,
  mockGetCampaignRecipientById,
  mockGetScanExecutionById,
  mockListPreviewsForBusiness,
  mockPublishSitePreview,
  mockCreatePostcardAction,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetBusinessById: vi.fn(),
  mockUpdateBusiness: vi.fn(),
  mockGetCampaignRecipientById: vi.fn(),
  mockGetScanExecutionById: vi.fn(),
  mockListPreviewsForBusiness: vi.fn(),
  mockPublishSitePreview: vi.fn(),
  mockCreatePostcardAction: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById, updateBusiness: mockUpdateBusiness }));
vi.mock('@/lib/db/campaign-recipients', () => ({ getCampaignRecipientById: mockGetCampaignRecipientById }));
vi.mock('@/lib/db/scan-executions', () => ({ getScanExecutionById: mockGetScanExecutionById }));
vi.mock('@/lib/db/site-previews', () => ({ listPreviewsForBusiness: mockListPreviewsForBusiness, publishSitePreview: mockPublishSitePreview }));
vi.mock('../../../postcards/actions', () => ({ createPostcardAction: mockCreatePostcardAction }));

import { publishAndGeneratePostcardsAction } from '../postcard-batch-actions';

const RECIPIENT = { campaignRecipientId: 'recipient_1', campaignId: 'campaign_1', businessId: 'biz_1' };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ sub: 'admin_1' });
  mockCreatePostcardAction.mockResolvedValue({ postcardId: 'postcard_1' });
});

describe('publishAndGeneratePostcardsAction', () => {
  it('returns an empty summary for an unauthenticated request', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const summary = await publishAndGeneratePostcardsAction('campaign_1', ['recipient_1']);
    expect(summary).toEqual({ published: 0, alreadyPublished: 0, postcardsGenerated: 0, alreadyHadPostcard: 0, failed: [] });
    expect(mockGetCampaignRecipientById).not.toHaveBeenCalled();
  });

  it('records a failure for a recipient not found in this campaign', async () => {
    mockGetCampaignRecipientById.mockResolvedValueOnce(null);
    const summary = await publishAndGeneratePostcardsAction('campaign_1', ['recipient_missing']);
    expect(summary.failed).toHaveLength(1);
    expect(mockGetBusinessById).not.toHaveBeenCalled();
  });

  it('counts a recipient that already has a postcard without touching publish/generation', async () => {
    mockGetCampaignRecipientById.mockResolvedValueOnce({ ...RECIPIENT, postcardId: 'postcard_existing' });
    const summary = await publishAndGeneratePostcardsAction('campaign_1', ['recipient_1']);
    expect(summary.alreadyHadPostcard).toBe(1);
    expect(mockGetBusinessById).not.toHaveBeenCalled();
    expect(mockCreatePostcardAction).not.toHaveBeenCalled();
  });

  it('records a failure when the business no longer exists', async () => {
    mockGetCampaignRecipientById.mockResolvedValueOnce(RECIPIENT);
    mockGetBusinessById.mockResolvedValueOnce(null);
    const summary = await publishAndGeneratePostcardsAction('campaign_1', ['recipient_1']);
    expect(summary.failed).toEqual([{ businessId: 'biz_1', businessName: '—', reason: 'Business not found.' }]);
  });

  it('records a failure when there is no preview to publish and never attempts postcard generation', async () => {
    mockGetCampaignRecipientById.mockResolvedValueOnce(RECIPIENT);
    mockGetBusinessById.mockResolvedValueOnce({ businessId: 'biz_1', name: 'Acme Plumbing' });
    mockListPreviewsForBusiness.mockResolvedValueOnce([]);

    const summary = await publishAndGeneratePostcardsAction('campaign_1', ['recipient_1']);

    expect(summary.failed).toEqual([{ businessId: 'biz_1', businessName: 'Acme Plumbing', reason: 'No generated website preview yet.' }]);
    expect(mockPublishSitePreview).not.toHaveBeenCalled();
    expect(mockCreatePostcardAction).not.toHaveBeenCalled();
  });

  it('resolves the preview via the latest scan execution, publishes, and generates the postcard', async () => {
    mockGetCampaignRecipientById.mockResolvedValueOnce(RECIPIENT);
    mockGetBusinessById.mockResolvedValueOnce({ businessId: 'biz_1', name: 'Acme Plumbing', latestScanExecutionId: 'scanexec_1' });
    mockGetScanExecutionById.mockResolvedValueOnce({ scanExecutionId: 'scanexec_1', previewId: 'preview_1' });
    mockPublishSitePreview.mockResolvedValueOnce({ previewId: 'preview_1', status: 'published' });

    const summary = await publishAndGeneratePostcardsAction('campaign_1', ['recipient_1']);

    expect(mockListPreviewsForBusiness).not.toHaveBeenCalled();
    expect(mockPublishSitePreview).toHaveBeenCalledWith('preview_1');
    expect(mockUpdateBusiness).toHaveBeenCalledWith('biz_1', { currentPreviewId: 'preview_1' });
    expect(summary.published).toBe(1);
    expect(summary.postcardsGenerated).toBe(1);
    expect(mockCreatePostcardAction).toHaveBeenCalledWith('recipient_1');
  });

  it('falls back to the newest non-archived preview when there is no scan execution pointer', async () => {
    mockGetCampaignRecipientById.mockResolvedValueOnce(RECIPIENT);
    mockGetBusinessById.mockResolvedValueOnce({ businessId: 'biz_1', name: 'Acme Plumbing' });
    mockListPreviewsForBusiness.mockResolvedValueOnce([
      { previewId: 'preview_archived', status: 'archived' },
      { previewId: 'preview_ready', status: 'ready' },
    ]);
    mockPublishSitePreview.mockResolvedValueOnce({ previewId: 'preview_ready', status: 'published' });

    const summary = await publishAndGeneratePostcardsAction('campaign_1', ['recipient_1']);

    expect(mockPublishSitePreview).toHaveBeenCalledWith('preview_ready');
    expect(summary.published).toBe(1);
  });

  it('skips publishing when the business already has a current preview', async () => {
    mockGetCampaignRecipientById.mockResolvedValueOnce(RECIPIENT);
    mockGetBusinessById.mockResolvedValueOnce({ businessId: 'biz_1', name: 'Acme Plumbing', currentPreviewId: 'preview_live' });

    const summary = await publishAndGeneratePostcardsAction('campaign_1', ['recipient_1']);

    expect(mockPublishSitePreview).not.toHaveBeenCalled();
    expect(summary.alreadyPublished).toBe(1);
    expect(summary.postcardsGenerated).toBe(1);
  });

  it('records a failure when postcard generation fails', async () => {
    mockGetCampaignRecipientById.mockResolvedValueOnce(RECIPIENT);
    mockGetBusinessById.mockResolvedValueOnce({ businessId: 'biz_1', name: 'Acme Plumbing', currentPreviewId: 'preview_live' });
    mockCreatePostcardAction.mockResolvedValueOnce({ error: 'This business has no generated website preview yet.' });

    const summary = await publishAndGeneratePostcardsAction('campaign_1', ['recipient_1']);

    expect(summary.postcardsGenerated).toBe(0);
    expect(summary.failed).toEqual([{ businessId: 'biz_1', businessName: 'Acme Plumbing', reason: 'This business has no generated website preview yet.' }]);
  });

  it('does not roll back a prior success when a later recipient fails', async () => {
    mockGetCampaignRecipientById
      .mockResolvedValueOnce({ ...RECIPIENT, campaignRecipientId: 'recipient_1', businessId: 'biz_1' })
      .mockResolvedValueOnce({ ...RECIPIENT, campaignRecipientId: 'recipient_2', businessId: 'biz_2' });
    mockGetBusinessById
      .mockResolvedValueOnce({ businessId: 'biz_1', name: 'Good Co', currentPreviewId: 'preview_1' })
      .mockResolvedValueOnce(null);
    mockCreatePostcardAction.mockResolvedValueOnce({ postcardId: 'postcard_1' });

    const summary = await publishAndGeneratePostcardsAction('campaign_1', ['recipient_1', 'recipient_2']);

    expect(summary.postcardsGenerated).toBe(1);
    expect(summary.failed).toHaveLength(1);
    expect(summary.failed[0].businessId).toBe('biz_2');
  });
});
