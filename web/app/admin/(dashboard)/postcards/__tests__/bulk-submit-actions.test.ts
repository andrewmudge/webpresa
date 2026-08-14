/**
 * Unit tests for the Stage 25 (Security Hardening) bulk Lob postcard
 * submission cap — `submitPostcardsToLobBulkAction`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockGetSession = vi.hoisted(() => vi.fn());
const mockSubmitPostcardToLob = vi.hoisted(() => vi.fn());
const mockGetCampaignRecipientById = vi.hoisted(() => vi.fn());
const mockLinkPostcardToCampaignRecipient = vi.hoisted(() => vi.fn());
const mockGetPostcardByCampaignRecipientId = vi.hoisted(() => vi.fn());
const mockPutPostcard = vi.hoisted(() => vi.fn());
const mockApprovePostcard = vi.hoisted(() => vi.fn());
const mockGetBusinessById = vi.hoisted(() => vi.fn());
const mockRenderPostcardArtifacts = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/lib/lob/submit-postcard', () => ({ submitPostcardToLob: mockSubmitPostcardToLob }));
vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById }));
vi.mock('@/lib/db/campaign-recipients', () => ({
  getCampaignRecipientById: mockGetCampaignRecipientById,
  linkPostcardToCampaignRecipient: mockLinkPostcardToCampaignRecipient,
}));
vi.mock('@/lib/db/postcards', () => ({
  getPostcardByCampaignRecipientId: mockGetPostcardByCampaignRecipientId,
  putPostcard: mockPutPostcard,
  approvePostcard: mockApprovePostcard,
}));
vi.mock('@/domain/factories/postcard.factory', () => ({ createPostcard: vi.fn() }));
vi.mock('@/lib/postcards/render', () => ({ renderPostcardArtifacts: mockRenderPostcardArtifacts }));

import { submitPostcardsToLobBulkAction } from '../actions';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ sub: 'admin_1' });
});

describe('submitPostcardsToLobBulkAction', () => {
  it('rejects an unauthenticated request without ever calling Lob', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const result = await submitPostcardsToLobBulkAction(['postcard_1']);
    expect(result.error).toBe('Unauthorized');
    expect(mockSubmitPostcardToLob).not.toHaveBeenCalled();
  });

  it('returns zero counts for an empty list without calling Lob', async () => {
    const result = await submitPostcardsToLobBulkAction([]);
    expect(result).toEqual({ submitted: 0, failed: 0 });
    expect(mockSubmitPostcardToLob).not.toHaveBeenCalled();
  });

  it('rejects a batch over the cap without submitting any of them', async () => {
    const ids = Array.from({ length: 26 }, (_, i) => `postcard_${i}`);
    const result = await submitPostcardsToLobBulkAction(ids);
    expect(result.error).toMatch(/25/);
    expect(mockSubmitPostcardToLob).not.toHaveBeenCalled();
  });

  it('submits every postcard at or under the cap and tallies success/failure', async () => {
    mockSubmitPostcardToLob
      .mockResolvedValueOnce({ status: 'submitted', providerPostcardId: 'psc_1' })
      .mockResolvedValueOnce({ status: 'failed', message: 'boom' })
      .mockResolvedValueOnce({ status: 'submitted', providerPostcardId: 'psc_3' });

    const result = await submitPostcardsToLobBulkAction(['postcard_1', 'postcard_2', 'postcard_3']);

    expect(mockSubmitPostcardToLob).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ submitted: 2, failed: 1 });
  });
});
