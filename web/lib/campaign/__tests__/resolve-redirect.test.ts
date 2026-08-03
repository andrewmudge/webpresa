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
const mockGetBusinessById = vi.hoisted(() => vi.fn());
const mockGetClaimById = vi.hoisted(() => vi.fn());
const mockSignClaimIntent = vi.hoisted(() => vi.fn());

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

vi.mock('@/lib/db/businesses', () => ({
  getBusinessById: mockGetBusinessById,
}));

vi.mock('@/lib/db/claims', () => ({
  getClaimById: mockGetClaimById,
  isClaimUsable: (claim: { status: string; expiresAt: string }) => claim.status === 'issued' && new Date(claim.expiresAt).getTime() >= Date.now(),
}));

vi.mock('@/lib/auth/claim-intent', () => ({
  signClaimIntent: mockSignClaimIntent,
  CLAIM_INTENT_MAX_AGE_SECONDS: 30 * 60,
}));

vi.mock('server-only', () => ({}));

import { resolveCampaignRedirect } from '../resolve-redirect';

const NOW = new Date().toISOString();
const FUTURE = new Date(Date.now() + 60_000).toISOString();

const RECIPIENT = {
  campaignRecipientId: 'recipient_00000000-0000-0000-0000-000000000001',
  campaignId: 'campaign_00000000-0000-0000-0000-000000000001',
  businessId: 'biz_00000000-0000-0000-0000-000000000001',
  campaignCode: 'AB23CD45EF67GH89',
  destinationType: 'custom' as const,
  destinationUrl: 'https://webpresa.com/b/acme-plumbing',
  status: 'active' as const,
  totalScans: 3,
  estimatedUniqueScans: 2,
  createdAt: NOW,
  updatedAt: NOW,
};

const CLAIM_RECIPIENT = {
  ...RECIPIENT,
  destinationType: 'claim' as const,
  destinationUrl: undefined,
  claimId: 'claim_00000000-0000-0000-0000-000000000001',
};

const CAMPAIGN = {
  campaignId: 'campaign_00000000-0000-0000-0000-000000000001',
  name: 'Spring drop',
  channel: 'postcard' as const,
  status: 'active' as const,
  createdAt: NOW,
  updatedAt: NOW,
};

const BUSINESS = {
  businessId: 'biz_00000000-0000-0000-0000-000000000001',
  slug: 'acme-plumbing',
  ownerUserId: undefined as string | undefined,
};

const CLAIM = {
  claimId: 'claim_00000000-0000-0000-0000-000000000001',
  businessId: 'biz_00000000-0000-0000-0000-000000000001',
  status: 'issued' as const,
  expiresAt: FUTURE,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckAndIncrementRateLimit.mockResolvedValue(true);
  mockGetCampaignRecipientByCode.mockResolvedValue(RECIPIENT);
  mockGetCampaignById.mockResolvedValue(CAMPAIGN);
  mockReserveVisitorFingerprint.mockResolvedValue(true);
  mockPutScanHit.mockResolvedValue(undefined);
  mockRecordScanHitRollup.mockResolvedValue(undefined);
  mockGetBusinessById.mockResolvedValue({ ...BUSINESS });
  mockGetClaimById.mockResolvedValue({ ...CLAIM });
  mockSignClaimIntent.mockResolvedValue('signed.jwt.token');
});

function baseParams(overrides: Partial<Parameters<typeof resolveCampaignRedirect>[0]> = {}) {
  return {
    campaignCode: RECIPIENT.campaignCode,
    ipHash: 'iphash123',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36',
    incomingSearchParams: new URLSearchParams(),
    requestUrl: 'https://webpresa.com/r/AB23CD45EF67GH89',
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

describe('resolveCampaignRedirect — claim-type destinations', () => {
  it('sets a claim-intent cookie and redirects to /b/{slug} when the referenced claim is still usable', async () => {
    mockGetCampaignRecipientByCode.mockResolvedValueOnce(CLAIM_RECIPIENT);
    const result = await resolveCampaignRedirect(baseParams());
    if (result.outcome !== 'redirect') throw new Error('expected redirect');
    expect(new URL(result.destinationUrl).pathname).toBe('/b/acme-plumbing');
    expect(result.claimIntentCookie).toEqual({ value: 'signed.jwt.token', maxAgeSeconds: 30 * 60 });
    expect(mockSignClaimIntent).toHaveBeenCalledWith({ claimId: CLAIM.claimId, businessId: CLAIM.businessId });
  });

  it('links to the live page with no cookie when the business is already claimed', async () => {
    mockGetCampaignRecipientByCode.mockResolvedValueOnce(CLAIM_RECIPIENT);
    mockGetBusinessById.mockResolvedValueOnce({ ...BUSINESS, ownerUserId: 'user_1' });
    const result = await resolveCampaignRedirect(baseParams());
    if (result.outcome !== 'redirect') throw new Error('expected redirect');
    expect(new URL(result.destinationUrl).pathname).toBe('/b/acme-plumbing');
    expect(result.claimIntentCookie).toBeUndefined();
    expect(mockGetClaimById).not.toHaveBeenCalled();
  });

  it('links to the live page with no cookie when no claim was ever provisioned (claimId absent)', async () => {
    mockGetCampaignRecipientByCode.mockResolvedValueOnce({ ...CLAIM_RECIPIENT, claimId: undefined });
    const result = await resolveCampaignRedirect(baseParams());
    if (result.outcome !== 'redirect') throw new Error('expected redirect');
    expect(result.claimIntentCookie).toBeUndefined();
    expect(mockGetClaimById).not.toHaveBeenCalled();
  });

  it('links to the live page with no cookie when the referenced claim is expired', async () => {
    mockGetCampaignRecipientByCode.mockResolvedValueOnce(CLAIM_RECIPIENT);
    mockGetClaimById.mockResolvedValueOnce({ ...CLAIM, expiresAt: new Date(Date.now() - 60_000).toISOString() });
    const result = await resolveCampaignRedirect(baseParams());
    if (result.outcome !== 'redirect') throw new Error('expected redirect');
    expect(result.claimIntentCookie).toBeUndefined();
  });

  it('links to the live page with no cookie when the referenced claim is already consumed', async () => {
    mockGetCampaignRecipientByCode.mockResolvedValueOnce(CLAIM_RECIPIENT);
    mockGetClaimById.mockResolvedValueOnce({ ...CLAIM, status: 'consumed' });
    const result = await resolveCampaignRedirect(baseParams());
    if (result.outcome !== 'redirect') throw new Error('expected redirect');
    expect(result.claimIntentCookie).toBeUndefined();
  });

  it('links to the live page with no cookie when the claim record belongs to a different business', async () => {
    mockGetCampaignRecipientByCode.mockResolvedValueOnce(CLAIM_RECIPIENT);
    mockGetClaimById.mockResolvedValueOnce({ ...CLAIM, businessId: 'biz_someone-else' });
    const result = await resolveCampaignRedirect(baseParams());
    if (result.outcome !== 'redirect') throw new Error('expected redirect');
    expect(result.claimIntentCookie).toBeUndefined();
  });

  it('returns "invalid" when the business no longer exists', async () => {
    mockGetCampaignRecipientByCode.mockResolvedValueOnce(CLAIM_RECIPIENT);
    mockGetBusinessById.mockResolvedValueOnce(null);
    const result = await resolveCampaignRedirect(baseParams());
    expect(result).toEqual({ outcome: 'invalid' });
  });

  it('records the resolved /b/{slug} URL (not a claim link) as the ScanHit destinationUrl', async () => {
    mockGetCampaignRecipientByCode.mockResolvedValueOnce(CLAIM_RECIPIENT);
    await resolveCampaignRedirect(baseParams());
    const hit = mockPutScanHit.mock.calls[0][0];
    expect(hit.destinationUrl).toContain('/b/acme-plumbing');
  });
});
