/**
 * Unit tests for `/r/[campaignCode]`'s validate → record → resolve-destination
 * logic (Stage 21). Every DB dependency is mocked; `createScanHit` (the real
 * domain factory) is exercised unmocked so its Zod validation catches any
 * shape mismatch between this module and the ScanHit schema.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetCampaignRecipientByCode = vi.hoisted(() => vi.fn());
const mockCheckAndIncrementRateLimit = vi.hoisted(() => vi.fn());
const mockRecordScanHitRollup = vi.hoisted(() => vi.fn());
const mockGetCampaignById = vi.hoisted(() => vi.fn());
const mockPutScanHit = vi.hoisted(() => vi.fn());
const mockReserveVisitorFingerprint = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db/campaign-recipients', () => ({
  getCampaignRecipientByCode: mockGetCampaignRecipientByCode,
  checkAndIncrementRateLimit: mockCheckAndIncrementRateLimit,
  buildRateLimitKey: (ipHash: string, windowBucket: string) => `RATELIMIT#${ipHash}#${windowBucket}`,
  recordScanHitRollup: mockRecordScanHitRollup,
}));

vi.mock('@/lib/db/campaigns', () => ({
  getCampaignById: mockGetCampaignById,
}));

vi.mock('@/lib/db/scan-hits', () => ({
  putScanHit: mockPutScanHit,
  reserveVisitorFingerprint: mockReserveVisitorFingerprint,
}));

vi.mock('server-only', () => ({}));

import { resolveCampaignRedirect } from '../resolve-redirect';

const NOW = new Date().toISOString();

const RECIPIENT = {
  campaignRecipientId: 'recipient_00000000-0000-0000-0000-000000000001',
  campaignId: 'campaign_00000000-0000-0000-0000-000000000001',
  businessId: 'biz_00000000-0000-0000-0000-000000000001',
  campaignCode: 'AB23CD45EF67GH89',
  destinationUrl: 'https://webpresa.com/b/acme-plumbing',
  status: 'active' as const,
  totalScans: 3,
  estimatedUniqueScans: 2,
  createdAt: NOW,
  updatedAt: NOW,
};

const CAMPAIGN = {
  campaignId: 'campaign_00000000-0000-0000-0000-000000000001',
  name: 'Spring drop',
  channel: 'postcard' as const,
  status: 'active' as const,
  createdAt: NOW,
  updatedAt: NOW,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckAndIncrementRateLimit.mockResolvedValue(true);
  mockGetCampaignRecipientByCode.mockResolvedValue(RECIPIENT);
  mockGetCampaignById.mockResolvedValue(CAMPAIGN);
  mockReserveVisitorFingerprint.mockResolvedValue(true);
  mockPutScanHit.mockResolvedValue(undefined);
  mockRecordScanHitRollup.mockResolvedValue(undefined);
});

function baseParams(overrides: Partial<Parameters<typeof resolveCampaignRedirect>[0]> = {}) {
  return {
    campaignCode: RECIPIENT.campaignCode,
    ipHash: 'iphash123',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36',
    incomingSearchParams: new URLSearchParams(),
    ...overrides,
  };
}

describe('resolveCampaignRedirect', () => {
  it('returns "invalid" once the rate limit is exceeded, without looking up the recipient', async () => {
    mockCheckAndIncrementRateLimit.mockResolvedValueOnce(false);
    const result = await resolveCampaignRedirect(baseParams());
    expect(result).toEqual({ outcome: 'invalid' });
    expect(mockGetCampaignRecipientByCode).not.toHaveBeenCalled();
  });

  it('returns "invalid" when no recipient matches the code', async () => {
    mockGetCampaignRecipientByCode.mockResolvedValueOnce(null);
    const result = await resolveCampaignRedirect(baseParams());
    expect(result).toEqual({ outcome: 'invalid' });
    expect(mockPutScanHit).not.toHaveBeenCalled();
  });

  it('returns "invalid" for a disabled recipient', async () => {
    mockGetCampaignRecipientByCode.mockResolvedValueOnce({ ...RECIPIENT, status: 'disabled' });
    const result = await resolveCampaignRedirect(baseParams());
    expect(result).toEqual({ outcome: 'invalid' });
    expect(mockPutScanHit).not.toHaveBeenCalled();
  });

  it('returns "invalid" when the parent campaign no longer exists', async () => {
    mockGetCampaignById.mockResolvedValueOnce(null);
    const result = await resolveCampaignRedirect(baseParams());
    expect(result).toEqual({ outcome: 'invalid' });
    expect(mockPutScanHit).not.toHaveBeenCalled();
  });

  it('returns "invalid" when the parent campaign is paused', async () => {
    mockGetCampaignById.mockResolvedValueOnce({ ...CAMPAIGN, status: 'paused' });
    const result = await resolveCampaignRedirect(baseParams());
    expect(result).toEqual({ outcome: 'invalid' });
    expect(mockPutScanHit).not.toHaveBeenCalled();
  });

  it('records a ScanHit and redirects to the destination for a valid, active code', async () => {
    const result = await resolveCampaignRedirect(baseParams());
    expect(result.outcome).toBe('redirect');
    expect(mockPutScanHit).toHaveBeenCalledTimes(1);
    const hit = mockPutScanHit.mock.calls[0][0];
    expect(hit.campaignRecipientId).toBe(RECIPIENT.campaignRecipientId);
    expect(hit.campaignCode).toBe(RECIPIENT.campaignCode);
    expect(hit.businessId).toBe(RECIPIENT.businessId);
    expect(hit.destinationUrl).toBe(RECIPIENT.destinationUrl);
    expect(hit.deviceClass).toBe('desktop');
  });

  it('increments the unique count only when the fingerprint reservation is new', async () => {
    mockReserveVisitorFingerprint.mockResolvedValueOnce(false);
    await resolveCampaignRedirect(baseParams());
    expect(mockRecordScanHitRollup).toHaveBeenCalledWith({
      campaignRecipientId: RECIPIENT.campaignRecipientId,
      isNewUniqueVisitor: false,
    });
  });

  it('never persists the raw IP — only a fingerprint hash derived from it', async () => {
    await resolveCampaignRedirect(baseParams({ ipHash: 'super-secret-ip-hash' }));
    const hit = mockPutScanHit.mock.calls[0][0];
    expect(hit.visitorFingerprint).not.toContain('super-secret-ip-hash');
    expect(hit.visitorFingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it('forwards incoming query parameters to the destination and appends the real campaign code', async () => {
    const result = await resolveCampaignRedirect(
      baseParams({ incomingSearchParams: new URLSearchParams('utm_source=email&utm_medium=postcard') }),
    );
    if (result.outcome !== 'redirect') throw new Error('expected redirect');
    const url = new URL(result.destinationUrl);
    expect(url.searchParams.get('utm_source')).toBe('email');
    expect(url.searchParams.get('utm_medium')).toBe('postcard');
    expect(url.searchParams.get('campaign')).toBe(RECIPIENT.campaignCode);
  });

  it('never trusts a client-supplied "campaign" query param — the resolved code always wins', async () => {
    const result = await resolveCampaignRedirect(
      baseParams({ incomingSearchParams: new URLSearchParams('campaign=SPOOFED-CODE-000') }),
    );
    if (result.outcome !== 'redirect') throw new Error('expected redirect');
    const url = new URL(result.destinationUrl);
    expect(url.searchParams.get('campaign')).toBe(RECIPIENT.campaignCode);
  });

  it('persists before returning the redirect — putScanHit resolves before the function returns', async () => {
    let putResolved = false;
    mockPutScanHit.mockImplementationOnce(async () => {
      putResolved = true;
    });
    await resolveCampaignRedirect(baseParams());
    expect(putResolved).toBe(true);
  });
});
