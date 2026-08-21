/**
 * Unit tests for the Analytics dashboard orchestration (Stage 29). All
 * `lib/db/*` calls and Next.js caching are mocked — no real AWS/Next calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Business } from '@/domain/models/business';
import type { Postcard } from '@/domain/models/postcard';
import type { CampaignRecipient } from '@/domain/models/campaign-recipient';

vi.mock('server-only', () => ({}));

// unstable_cache: pass the function straight through (no real caching in tests).
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

const { mockListAllBusinesses, mockListAllPostcards, mockListAllCampaigns, mockListCampaignRecipientsByIds } = vi.hoisted(() => ({
  mockListAllBusinesses: vi.fn(),
  mockListAllPostcards: vi.fn(),
  mockListAllCampaigns: vi.fn(),
  mockListCampaignRecipientsByIds: vi.fn(),
}));

vi.mock('@/lib/db/businesses', () => ({ listAllBusinesses: mockListAllBusinesses }));
vi.mock('@/lib/db/postcards', () => ({ listAllPostcards: mockListAllPostcards }));
vi.mock('@/lib/db/campaigns', () => ({ listAllCampaigns: mockListAllCampaigns }));
vi.mock('@/lib/db/campaign-recipients', () => ({ listCampaignRecipientsByIds: mockListCampaignRecipientsByIds }));

import { getAnalyticsDashboardData } from '../dashboard';

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_1',
    slug: 'acme',
    name: 'Acme',
    industry: 'plumbing',
    source: 'manual',
    status: 'customer',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    subscriptionStatus: 'active',
    firstPaidAt: '2026-07-10T00:00:00.000Z',
    plan: 'basic',
    billingInterval: 'monthly',
    ...overrides,
  };
}

function makePostcard(overrides: Partial<Postcard> = {}): Postcard {
  return {
    postcardId: 'postcard_1',
    businessId: 'biz_1',
    previewId: 'preview_1',
    campaignRecipientId: 'recipient_1',
    provider: 'lob',
    status: 'submitted',
    submittedAt: '2026-07-05T00:00:00.000Z',
    templateVariant: 'has_website',
    createdAt: '2026-07-05T00:00:00.000Z',
    updatedAt: '2026-07-05T00:00:00.000Z',
    ...overrides,
  };
}

function makeRecipient(overrides: Partial<CampaignRecipient> = {}): CampaignRecipient {
  return {
    campaignRecipientId: 'recipient_1',
    campaignId: 'campaign_1',
    businessId: 'biz_1',
    campaignCode: 'ABCD1234EFGH5678',
    destinationType: 'claim',
    status: 'active',
    totalScans: 1,
    estimatedUniqueScans: 1,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListAllCampaigns.mockResolvedValue([{ campaignId: 'campaign_1', name: 'Summer batch' }]);
  mockListCampaignRecipientsByIds.mockResolvedValue([]);
});

describe('getAnalyticsDashboardData', () => {
  it('assembles a full view model from the underlying repositories', async () => {
    mockListAllBusinesses.mockResolvedValue([makeBusiness()]);
    mockListAllPostcards.mockResolvedValue([makePostcard()]);
    mockListCampaignRecipientsByIds.mockResolvedValue([makeRecipient()]);

    const result = await getAnalyticsDashboardData({ datePreset: 'all' });

    expect(result.kpis.activeCustomers.current).toBe(1);
    expect(result.kpis.mrrCents.current).toBe(3900);
    expect(result.funnel.cohortSize).toBe(1);
    expect(result.filterOptions.campaigns).toEqual([{ campaignId: 'campaign_1', name: 'Summer batch' }]);
  });

  it('counts a currently-active customer toward Active Customers/MRR even with no recorded firstPaidAt (pre-Stage-29 customer)', async () => {
    // Regression: businesses that became paying customers before firstPaidAt
    // started being written must still show up as active right now.
    const preInstrumentedCustomer = makeBusiness({
      businessId: 'biz_legacy',
      subscriptionStatus: 'active',
      firstPaidAt: undefined,
      plan: 'basic',
      billingInterval: 'monthly',
    });
    mockListAllBusinesses.mockResolvedValue([preInstrumentedCustomer]);
    mockListAllPostcards.mockResolvedValue([]);

    const result = await getAnalyticsDashboardData({ datePreset: '30d' });

    expect(result.kpis.activeCustomers.current).toBe(1);
    expect(result.kpis.mrrCents.current).toBe(3900);
    expect(result.customerHealth.activeCustomers).toBe(1);
  });

  it('narrows businesses (and transitively the postcard cohort) by industry', async () => {
    const inIndustry = makeBusiness({ businessId: 'biz_in', industry: 'plumbing' });
    const outOfIndustry = makeBusiness({ businessId: 'biz_out', industry: 'electrical', firstPaidAt: '2026-07-11T00:00:00.000Z' });
    mockListAllBusinesses.mockResolvedValue([inIndustry, outOfIndustry]);
    mockListAllPostcards.mockResolvedValue([
      makePostcard({ postcardId: 'pc_in', businessId: 'biz_in', campaignRecipientId: 'recipient_in' }),
      makePostcard({ postcardId: 'pc_out', businessId: 'biz_out', campaignRecipientId: 'recipient_out' }),
    ]);
    mockListCampaignRecipientsByIds.mockResolvedValue([
      makeRecipient({ campaignRecipientId: 'recipient_in', businessId: 'biz_in' }),
      makeRecipient({ campaignRecipientId: 'recipient_out', businessId: 'biz_out' }),
    ]);

    const result = await getAnalyticsDashboardData({ datePreset: 'all', industry: 'plumbing' });

    expect(result.kpis.activeCustomers.current).toBe(1); // electrical business excluded
    expect(result.funnel.cohortSize).toBe(1); // its postcard excluded too
  });

  it('narrows the postcard cohort (but not MRR/customer-health) by template', async () => {
    const business = makeBusiness();
    mockListAllBusinesses.mockResolvedValue([business]);
    mockListAllPostcards.mockResolvedValue([
      makePostcard({ postcardId: 'pc_has', campaignRecipientId: 'recipient_1', templateVariant: 'has_website' }),
      makePostcard({ postcardId: 'pc_no', campaignRecipientId: 'recipient_2', templateVariant: 'no_website' }),
    ]);
    mockListCampaignRecipientsByIds.mockResolvedValue([
      makeRecipient({ campaignRecipientId: 'recipient_1' }),
      makeRecipient({ campaignRecipientId: 'recipient_2' }),
    ]);

    const result = await getAnalyticsDashboardData({ datePreset: 'all', templateVariant: 'has_website' });

    expect(result.funnel.cohortSize).toBe(1);
    expect(result.kpis.mrrCents.current).toBe(3900); // unaffected by the template filter
  });

  it('narrows the postcard cohort by campaign', async () => {
    const business = makeBusiness();
    mockListAllBusinesses.mockResolvedValue([business]);
    mockListAllPostcards.mockResolvedValue([
      makePostcard({ postcardId: 'pc_a', campaignRecipientId: 'recipient_a' }),
      makePostcard({ postcardId: 'pc_b', campaignRecipientId: 'recipient_b' }),
    ]);
    mockListCampaignRecipientsByIds.mockResolvedValue([
      makeRecipient({ campaignRecipientId: 'recipient_a', campaignId: 'campaign_a' }),
      makeRecipient({ campaignRecipientId: 'recipient_b', campaignId: 'campaign_b' }),
    ]);

    const result = await getAnalyticsDashboardData({ datePreset: 'all', campaignId: 'campaign_a' });

    expect(result.funnel.cohortSize).toBe(1);
  });

  it('excludes one-off test postcards (no campaignRecipientId) from the cohort', async () => {
    mockListAllBusinesses.mockResolvedValue([makeBusiness()]);
    mockListAllPostcards.mockResolvedValue([makePostcard({ campaignRecipientId: undefined })]);

    const result = await getAnalyticsDashboardData({ datePreset: 'all' });

    expect(result.funnel.cohortSize).toBe(0);
    expect(mockListCampaignRecipientsByIds).toHaveBeenCalledWith([]);
  });

  it('excludes postcards that were never actually submitted', async () => {
    mockListAllBusinesses.mockResolvedValue([makeBusiness()]);
    mockListAllPostcards.mockResolvedValue([makePostcard({ status: 'pending', submittedAt: undefined })]);

    const result = await getAnalyticsDashboardData({ datePreset: 'all' });

    expect(result.funnel.cohortSize).toBe(0);
  });

  it('propagates a repository failure rather than swallowing it silently', async () => {
    mockListAllBusinesses.mockRejectedValue(new Error('dynamodb down'));
    mockListAllPostcards.mockResolvedValue([]);

    await expect(getAnalyticsDashboardData({ datePreset: '30d' })).rejects.toThrow('dynamodb down');
  });

  it('returns a well-formed empty view model when nothing exists yet', async () => {
    mockListAllBusinesses.mockResolvedValue([]);
    mockListAllPostcards.mockResolvedValue([]);

    const result = await getAnalyticsDashboardData({ datePreset: '30d' });

    expect(result.kpis.activeCustomers.current).toBe(0);
    expect(result.subscriberMix).toEqual({ status: 'empty' });
    expect(result.bestTemplate).toEqual({ status: 'insufficient_data' });
    expect(result.cancellationReasons).toEqual({ collected: false, breakdown: [] });
  });
});
