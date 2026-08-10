/**
 * Unit tests for the campaign admin Server Actions (Stage 21).
 * All DynamoDB interactions and auth are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetSession,
  mockGetBusinessById,
  mockListClaimsForBusiness,
  mockPutClaim,
  mockGenerateAndHashClaimToken,
  mockGetCampaignById,
  mockPutCampaign,
  mockUpdateCampaignStatus,
  mockDeleteCampaignById,
  mockListCampaignRecipientsForCampaign,
  mockGetCampaignRecipientById,
  mockPutCampaignRecipient,
  mockUpdateCampaignRecipientDestination,
  mockUpdateCampaignRecipientStatus,
  mockDeleteCampaignRecipientById,
  mockDeleteAllScanHitsForRecipient,
  mockGenerateCampaignCode,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetBusinessById: vi.fn(),
  mockListClaimsForBusiness: vi.fn(),
  mockPutClaim: vi.fn(),
  mockGenerateAndHashClaimToken: vi.fn(),
  mockGetCampaignById: vi.fn(),
  mockPutCampaign: vi.fn(),
  mockUpdateCampaignStatus: vi.fn(),
  mockDeleteCampaignById: vi.fn(),
  mockListCampaignRecipientsForCampaign: vi.fn(),
  mockGetCampaignRecipientById: vi.fn(),
  mockPutCampaignRecipient: vi.fn(),
  mockUpdateCampaignRecipientDestination: vi.fn(),
  mockUpdateCampaignRecipientStatus: vi.fn(),
  mockDeleteCampaignRecipientById: vi.fn(),
  mockDeleteAllScanHitsForRecipient: vi.fn(),
  mockGenerateCampaignCode: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById }));

vi.mock('@/lib/db/claims', () => ({
  listClaimsForBusiness: mockListClaimsForBusiness,
  isClaimUsable: (claim: { status: string; expiresAt: string }) => claim.status === 'issued' && new Date(claim.expiresAt).getTime() >= Date.now(),
  putClaim: mockPutClaim,
}));

vi.mock('@/lib/claim/token', () => ({ generateAndHashClaimToken: mockGenerateAndHashClaimToken }));

vi.mock('@/lib/db/campaigns', () => ({
  getCampaignById: mockGetCampaignById,
  putCampaign: mockPutCampaign,
  updateCampaignStatus: mockUpdateCampaignStatus,
  deleteCampaignById: mockDeleteCampaignById,
}));

vi.mock('@/lib/db/campaign-recipients', () => ({
  listCampaignRecipientsForCampaign: mockListCampaignRecipientsForCampaign,
  getCampaignRecipientById: mockGetCampaignRecipientById,
  putCampaignRecipient: mockPutCampaignRecipient,
  updateCampaignRecipientDestination: mockUpdateCampaignRecipientDestination,
  updateCampaignRecipientStatus: mockUpdateCampaignRecipientStatus,
  deleteCampaignRecipientById: mockDeleteCampaignRecipientById,
}));

vi.mock('@/lib/db/scan-hits', () => ({ deleteAllScanHitsForRecipient: mockDeleteAllScanHitsForRecipient }));

vi.mock('@/lib/campaign/code', () => ({ generateCampaignCode: mockGenerateCampaignCode }));

import {
  createCampaignAction,
  updateCampaignStatusAction,
  deleteCampaignAction,
  addCampaignRecipientAction,
  updateCampaignRecipientStatusAction,
  removeCampaignRecipientsAction,
} from '../actions';

const SESSION = { sub: 'admin_1' };
const FUTURE = new Date(Date.now() + 60_000).toISOString();
const PAST = new Date(Date.now() - 60_000).toISOString();

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(SESSION);
  mockGenerateCampaignCode.mockReturnValue('AB23CD45EF67GH89');
  mockGetCampaignById.mockResolvedValue({ campaignId: 'campaign_1', name: 'Test', channel: 'postcard', status: 'active', createdAt: FUTURE, updatedAt: FUTURE });
});

describe('createCampaignAction', () => {
  it('rejects an unauthenticated request', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const result = await createCampaignAction({ name: 'x', channel: 'postcard' });
    expect(result).toEqual({ error: 'Unauthorized' });
  });

  it('rejects an empty name', async () => {
    const result = await createCampaignAction({ name: '  ', channel: 'postcard' });
    expect(result.error).toBeTruthy();
    expect(mockPutCampaign).not.toHaveBeenCalled();
  });

  it('creates a campaign and returns its id', async () => {
    mockPutCampaign.mockResolvedValueOnce(undefined);
    const result = await createCampaignAction({ name: 'Spring drop', channel: 'postcard' });
    expect(result.error).toBeUndefined();
    expect(result.campaignId).toMatch(/^campaign_/);
    expect(mockPutCampaign).toHaveBeenCalledTimes(1);
  });
});

describe('updateCampaignStatusAction', () => {
  it('returns an error when the campaign does not exist', async () => {
    mockGetCampaignById.mockResolvedValueOnce(null);
    const result = await updateCampaignStatusAction('campaign_missing', 'paused');
    expect(result.error).toBeTruthy();
    expect(mockUpdateCampaignStatus).not.toHaveBeenCalled();
  });

  it('updates the status', async () => {
    const result = await updateCampaignStatusAction('campaign_1', 'paused');
    expect(result).toEqual({});
    expect(mockUpdateCampaignStatus).toHaveBeenCalledWith('campaign_1', 'paused');
  });
});

describe('deleteCampaignAction', () => {
  beforeEach(() => {
    mockListCampaignRecipientsForCampaign.mockResolvedValue([]);
  });

  it('rejects an unauthenticated request', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const result = await deleteCampaignAction('campaign_1');
    expect(result.error).toBeTruthy();
    expect(mockDeleteCampaignById).not.toHaveBeenCalled();
  });

  it('returns an error when the campaign does not exist', async () => {
    mockGetCampaignById.mockResolvedValueOnce(null);
    const result = await deleteCampaignAction('campaign_missing');
    expect(result.error).toBeTruthy();
    expect(mockDeleteCampaignById).not.toHaveBeenCalled();
  });

  it('deletes the campaign directly when it has no recipients', async () => {
    const result = await deleteCampaignAction('campaign_1');
    expect(result).toEqual({});
    expect(mockDeleteAllScanHitsForRecipient).not.toHaveBeenCalled();
    expect(mockDeleteCampaignRecipientById).not.toHaveBeenCalled();
    expect(mockDeleteCampaignById).toHaveBeenCalledWith('campaign_1');
  });

  it('cascades through every recipient\'s scan history and the recipient itself before deleting the campaign', async () => {
    mockListCampaignRecipientsForCampaign.mockResolvedValueOnce([
      { campaignRecipientId: 'recipient_1' },
      { campaignRecipientId: 'recipient_2' },
    ]);

    const result = await deleteCampaignAction('campaign_1');

    expect(result).toEqual({});
    expect(mockDeleteAllScanHitsForRecipient).toHaveBeenCalledWith('recipient_1');
    expect(mockDeleteAllScanHitsForRecipient).toHaveBeenCalledWith('recipient_2');
    expect(mockDeleteCampaignRecipientById).toHaveBeenCalledWith('recipient_1');
    expect(mockDeleteCampaignRecipientById).toHaveBeenCalledWith('recipient_2');
    expect(mockDeleteCampaignById).toHaveBeenCalledWith('campaign_1');
  });
});

describe('addCampaignRecipientAction', () => {
  const BUSINESS = { businessId: 'biz_1', slug: 'acme-plumbing', name: 'Acme Plumbing', ownerUserId: undefined as string | undefined };

  it('rejects an unauthenticated request', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const result = await addCampaignRecipientAction('campaign_1', { businessId: 'biz_1' });
    expect(result).toEqual({ error: 'Unauthorized' });
  });

  it('rejects a missing business selection', async () => {
    const result = await addCampaignRecipientAction('campaign_1', { businessId: '  ' });
    expect(result.error).toBeTruthy();
  });

  it('builds a custom-destination recipient when destinationUrl is supplied', async () => {
    mockGetBusinessById.mockResolvedValueOnce(BUSINESS);
    const result = await addCampaignRecipientAction('campaign_1', { businessId: 'biz_1', destinationUrl: 'https://webpresa.com/pricing' });
    expect(result).toEqual({});
    expect(mockListClaimsForBusiness).not.toHaveBeenCalled();
    const recipient = mockPutCampaignRecipient.mock.calls[0][0];
    expect(recipient.destinationType).toBe('custom');
    expect(recipient.destinationUrl).toBe('https://webpresa.com/pricing');
  });

  it('rejects an invalid custom destinationUrl', async () => {
    mockGetBusinessById.mockResolvedValueOnce(BUSINESS);
    const result = await addCampaignRecipientAction('campaign_1', { businessId: 'biz_1', destinationUrl: 'not-a-url' });
    expect(result.error).toBeTruthy();
    expect(mockPutCampaignRecipient).not.toHaveBeenCalled();
  });

  it('reuses an existing usable claim instead of generating a new one', async () => {
    mockGetBusinessById.mockResolvedValueOnce(BUSINESS);
    mockListClaimsForBusiness.mockResolvedValueOnce([{ claimId: 'claim_existing', status: 'issued', expiresAt: FUTURE }]);

    const result = await addCampaignRecipientAction('campaign_1', { businessId: 'biz_1' });

    expect(result).toEqual({});
    expect(mockGenerateAndHashClaimToken).not.toHaveBeenCalled();
    const recipient = mockPutCampaignRecipient.mock.calls[0][0];
    expect(recipient.destinationType).toBe('claim');
    expect(recipient.claimId).toBe('claim_existing');
  });

  it('skips expired/revoked claims and generates a fresh one when none are usable', async () => {
    mockGetBusinessById.mockResolvedValueOnce(BUSINESS);
    mockListClaimsForBusiness.mockResolvedValueOnce([
      { claimId: 'claim_expired', status: 'issued', expiresAt: PAST },
      { claimId: 'claim_revoked', status: 'revoked', expiresAt: FUTURE },
    ]);
    mockGenerateAndHashClaimToken.mockResolvedValueOnce({ rawToken: 'RAW-TOKEN-1234', tokenHash: 'a'.repeat(64) });

    const result = await addCampaignRecipientAction('campaign_1', { businessId: 'biz_1' });

    expect(result.rawToken).toBe('RAW-TOKEN-1234');
    expect(mockPutClaim).toHaveBeenCalledTimes(1);
    const recipient = mockPutCampaignRecipient.mock.calls[0][0];
    expect(recipient.destinationType).toBe('claim');
    expect(recipient.claimId).toBeTruthy();
  });

  it('never returns a rawToken when an existing claim was reused', async () => {
    mockGetBusinessById.mockResolvedValueOnce(BUSINESS);
    mockListClaimsForBusiness.mockResolvedValueOnce([{ claimId: 'claim_existing', status: 'issued', expiresAt: FUTURE }]);
    const result = await addCampaignRecipientAction('campaign_1', { businessId: 'biz_1' });
    expect(result.rawToken).toBeUndefined();
  });

  it('skips claim lookup/generation entirely for an already-claimed business', async () => {
    mockGetBusinessById.mockResolvedValueOnce({ ...BUSINESS, ownerUserId: 'user_1' });
    const result = await addCampaignRecipientAction('campaign_1', { businessId: 'biz_1' });

    expect(result).toEqual({});
    expect(mockListClaimsForBusiness).not.toHaveBeenCalled();
    expect(mockGenerateAndHashClaimToken).not.toHaveBeenCalled();
    const recipient = mockPutCampaignRecipient.mock.calls[0][0];
    expect(recipient.destinationType).toBe('claim');
    expect(recipient.claimId).toBeUndefined();
  });
});

describe('removeCampaignRecipientsAction', () => {
  it('rejects an unauthenticated request', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const result = await removeCampaignRecipientsAction('campaign_1', ['recipient_1']);
    expect(result.error).toBeTruthy();
    expect(mockDeleteCampaignRecipientById).not.toHaveBeenCalled();
  });

  it('returns an error when the campaign does not exist', async () => {
    mockGetCampaignById.mockResolvedValueOnce(null);
    const result = await removeCampaignRecipientsAction('campaign_missing', ['recipient_1']);
    expect(result.error).toBeTruthy();
    expect(mockDeleteCampaignRecipientById).not.toHaveBeenCalled();
  });

  it('cascades scan hits and deletes each matching recipient', async () => {
    mockGetCampaignRecipientById
      .mockResolvedValueOnce({ campaignRecipientId: 'recipient_1', campaignId: 'campaign_1' })
      .mockResolvedValueOnce({ campaignRecipientId: 'recipient_2', campaignId: 'campaign_1' });

    const result = await removeCampaignRecipientsAction('campaign_1', ['recipient_1', 'recipient_2']);

    expect(result).toEqual({ removed: 2 });
    expect(mockDeleteAllScanHitsForRecipient).toHaveBeenCalledWith('recipient_1');
    expect(mockDeleteAllScanHitsForRecipient).toHaveBeenCalledWith('recipient_2');
    expect(mockDeleteCampaignRecipientById).toHaveBeenCalledWith('recipient_1');
    expect(mockDeleteCampaignRecipientById).toHaveBeenCalledWith('recipient_2');
  });

  it('ignores a recipient that does not exist', async () => {
    mockGetCampaignRecipientById.mockResolvedValueOnce(null);
    const result = await removeCampaignRecipientsAction('campaign_1', ['recipient_missing']);
    expect(result).toEqual({ removed: 0 });
    expect(mockDeleteCampaignRecipientById).not.toHaveBeenCalled();
  });

  it('ignores a recipient that belongs to a different campaign', async () => {
    mockGetCampaignRecipientById.mockResolvedValueOnce({ campaignRecipientId: 'recipient_1', campaignId: 'campaign_other' });
    const result = await removeCampaignRecipientsAction('campaign_1', ['recipient_1']);
    expect(result).toEqual({ removed: 0 });
    expect(mockDeleteCampaignRecipientById).not.toHaveBeenCalled();
  });
});

describe('updateCampaignRecipientStatusAction', () => {
  it('rejects an unauthenticated request', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const result = await updateCampaignRecipientStatusAction('recipient_1', 'disabled');
    expect(result).toEqual({ error: 'Unauthorized' });
    expect(mockUpdateCampaignRecipientStatus).not.toHaveBeenCalled();
  });

  it('updates the status', async () => {
    const result = await updateCampaignRecipientStatusAction('recipient_1', 'disabled');
    expect(result).toEqual({});
    expect(mockUpdateCampaignRecipientStatus).toHaveBeenCalledWith('recipient_1', 'disabled');
  });
});
