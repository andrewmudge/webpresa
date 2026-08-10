/**
 * Unit tests for the campaign-scoped Discover import action (Stage 21
 * redesign) — combines business creation with automatically adding the
 * business as a campaign recipient. All lib calls and the underlying
 * `addCampaignRecipientAction` are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GooglePlaceSearchResult } from '@/domain/models/google-places';

const { mockGetSession, mockGetCampaignById, mockFindDuplicateSignalsForBatch, mockImportGooglePlaceCandidate, mockAddCampaignRecipientAction } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetCampaignById: vi.fn(),
  mockFindDuplicateSignalsForBatch: vi.fn(),
  mockImportGooglePlaceCandidate: vi.fn(),
  mockAddCampaignRecipientAction: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/lib/db/campaigns', () => ({ getCampaignById: mockGetCampaignById }));
vi.mock('@/lib/google-places/duplicates', () => ({ findDuplicateSignalsForBatch: mockFindDuplicateSignalsForBatch }));
vi.mock('@/lib/google-places/import-candidate', () => ({ importGooglePlaceCandidate: mockImportGooglePlaceCandidate }));
vi.mock('../../../actions', () => ({ addCampaignRecipientAction: mockAddCampaignRecipientAction }));

import { importSelectedPlacesForCampaignAction } from '../actions';

function makeResult(overrides: Partial<GooglePlaceSearchResult> = {}): GooglePlaceSearchResult {
  return {
    placeId: 'place_1',
    name: 'Acme Plumbing',
    formattedAddress: '123 Main St, Austin, TX 78701, USA',
    address: { line1: '123 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
    phone: '+1 512-555-0100',
    websiteUrl: 'https://acme-plumbing.com',
    mappedIndustry: 'plumbing',
    rating: 4.7,
    userRatingCount: 82,
    duplicateSignals: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ sub: 'admin' });
  mockGetCampaignById.mockResolvedValue({ campaignId: 'campaign_1', name: 'Spring drop' });
  mockFindDuplicateSignalsForBatch.mockResolvedValue(new Map());
});

describe('importSelectedPlacesForCampaignAction', () => {
  it('rejects an unauthenticated request', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const state = await importSelectedPlacesForCampaignAction('campaign_1', [{ result: makeResult(), industry: 'plumbing' }]);
    expect(state.failures[0]?.reason).toBe('Unauthorized');
    expect(mockImportGooglePlaceCandidate).not.toHaveBeenCalled();
  });

  it('returns an empty summary for no selections', async () => {
    const state = await importSelectedPlacesForCampaignAction('campaign_1', []);
    expect(state).toEqual({ imported: 0, duplicates: 0, failed: 0, failures: [] });
  });

  it('fails when the campaign does not exist', async () => {
    mockGetCampaignById.mockResolvedValueOnce(null);
    const state = await importSelectedPlacesForCampaignAction('campaign_missing', [{ result: makeResult(), industry: 'plumbing' }]);
    expect(state.failures[0]?.reason).toBe('Campaign not found.');
    expect(mockImportGooglePlaceCandidate).not.toHaveBeenCalled();
  });

  it('imports a business and adds it as a campaign recipient in one step', async () => {
    mockImportGooglePlaceCandidate.mockResolvedValueOnce({ businessId: 'biz_1' });
    mockAddCampaignRecipientAction.mockResolvedValueOnce({});

    const state = await importSelectedPlacesForCampaignAction('campaign_1', [{ result: makeResult(), industry: 'plumbing' }]);

    expect(state.imported).toBe(1);
    expect(state.failed).toBe(0);
    expect(mockImportGooglePlaceCandidate).toHaveBeenCalledWith(expect.objectContaining({ placeId: 'place_1' }), 'plumbing');
    expect(mockAddCampaignRecipientAction).toHaveBeenCalledWith('campaign_1', { businessId: 'biz_1' });
  });

  it('skips a blocking duplicate without an explicit override', async () => {
    mockFindDuplicateSignalsForBatch.mockResolvedValueOnce(
      new Map([['place_1', [{ type: 'domain', confidence: 'blocking', matchedBusinessId: 'biz_x', matchedBusinessName: 'Existing Co' }]]]),
    );

    const state = await importSelectedPlacesForCampaignAction('campaign_1', [{ result: makeResult(), industry: 'plumbing' }]);

    expect(state.duplicates).toBe(1);
    expect(state.imported).toBe(0);
    expect(mockImportGooglePlaceCandidate).not.toHaveBeenCalled();
  });

  it('records a failure when business creation fails, without calling addCampaignRecipientAction', async () => {
    mockImportGooglePlaceCandidate.mockResolvedValueOnce({ error: 'Could not save business' });

    const state = await importSelectedPlacesForCampaignAction('campaign_1', [{ result: makeResult(), industry: 'plumbing' }]);

    expect(state.failed).toBe(1);
    expect(state.imported).toBe(0);
    expect(mockAddCampaignRecipientAction).not.toHaveBeenCalled();
  });

  it('records a failure when the business is created but adding it as a recipient fails', async () => {
    mockImportGooglePlaceCandidate.mockResolvedValueOnce({ businessId: 'biz_1' });
    mockAddCampaignRecipientAction.mockResolvedValueOnce({ error: 'Campaign not found.' });

    const state = await importSelectedPlacesForCampaignAction('campaign_1', [{ result: makeResult(), industry: 'plumbing' }]);

    expect(state.imported).toBe(0);
    expect(state.failed).toBe(1);
    expect(state.failures[0]?.reason).toMatch(/Imported but could not add to campaign/);
  });

  it('does not roll back a prior success when a later selection fails', async () => {
    mockImportGooglePlaceCandidate
      .mockResolvedValueOnce({ businessId: 'biz_1' })
      .mockResolvedValueOnce({ error: 'Could not save business' });
    mockAddCampaignRecipientAction.mockResolvedValueOnce({});

    const state = await importSelectedPlacesForCampaignAction('campaign_1', [
      { result: makeResult({ placeId: 'place_1', name: 'Good Co' }), industry: 'plumbing' },
      { result: makeResult({ placeId: 'place_2', name: 'Bad Co' }), industry: 'plumbing' },
    ]);

    expect(state.imported).toBe(1);
    expect(state.failed).toBe(1);
    expect(state.failures[0]?.name).toBe('Bad Co');
  });
});
