/**
 * Unit tests for the single shared eligibility check — the load-bearing
 * "may this business receive its next marketing email right now" gate
 * called fresh before every send. All DB/campaign lookups are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockEnsureMarketingCampaignExists, mockGetMarketingSuppression, mockGetBusinessById, mockGetCampaignRecipientById } = vi.hoisted(() => ({
  mockEnsureMarketingCampaignExists: vi.fn(),
  mockGetMarketingSuppression: vi.fn(),
  mockGetBusinessById: vi.fn(),
  mockGetCampaignRecipientById: vi.fn(),
}));

vi.mock('../campaign', () => ({ ensureMarketingCampaignExists: mockEnsureMarketingCampaignExists }));
vi.mock('@/lib/db/marketing-suppressions', () => ({ getMarketingSuppression: mockGetMarketingSuppression }));
vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById }));
vi.mock('@/lib/db/campaign-recipients', () => ({ getCampaignRecipientById: mockGetCampaignRecipientById }));

import { checkMarketingEligibility } from '../eligibility';

const ACTIVE_OUTREACH = { businessId: 'biz_1', status: 'active' as const, campaignRecipientId: 'recipient_1' };

beforeEach(() => {
  vi.clearAllMocks();
  mockEnsureMarketingCampaignExists.mockResolvedValue({ status: 'enabled' });
  mockGetMarketingSuppression.mockResolvedValue(null);
  mockGetBusinessById.mockResolvedValue({ businessId: 'biz_1', status: 'outreach', email: 'owner@example.com' });
  mockGetCampaignRecipientById.mockResolvedValue({ totalScans: 0 });
});

describe('checkMarketingEligibility — happy path', () => {
  it('is eligible when every check passes', async () => {
    const result = await checkMarketingEligibility(ACTIVE_OUTREACH);
    expect(result).toEqual({ eligible: true, targetEmail: 'owner@example.com' });
  });

  it('prefers leadNotificationEmail over the public email', async () => {
    mockGetBusinessById.mockResolvedValue({ businessId: 'biz_1', status: 'outreach', email: 'public@example.com', leadNotificationEmail: 'owner-inbox@example.com' });
    const result = await checkMarketingEligibility(ACTIVE_OUTREACH);
    expect(result).toEqual({ eligible: true, targetEmail: 'owner-inbox@example.com' });
  });
});

describe('checkMarketingEligibility — stop conditions', () => {
  it('is ineligible when the campaign is disabled', async () => {
    mockEnsureMarketingCampaignExists.mockResolvedValue({ status: 'disabled' });
    expect(await checkMarketingEligibility(ACTIVE_OUTREACH)).toEqual({ eligible: false, reason: 'campaign_disabled' });
  });

  it('is ineligible when the outreach is not active (e.g. already paused)', async () => {
    const result = await checkMarketingEligibility({ ...ACTIVE_OUTREACH, status: 'paused' });
    expect(result).toEqual({ eligible: false, reason: 'outreach_not_active' });
  });

  it('is ineligible when the business no longer exists', async () => {
    mockGetBusinessById.mockResolvedValue(null);
    expect(await checkMarketingEligibility(ACTIVE_OUTREACH)).toEqual({ eligible: false, reason: 'business_not_found' });
  });

  it('is ineligible when the business has been claimed', async () => {
    mockGetBusinessById.mockResolvedValue({ businessId: 'biz_1', status: 'claimed', email: 'owner@example.com' });
    expect(await checkMarketingEligibility(ACTIVE_OUTREACH)).toEqual({ eligible: false, reason: 'business_claimed' });
  });

  it('is ineligible when the business has become a paying customer', async () => {
    mockGetBusinessById.mockResolvedValue({ businessId: 'biz_1', status: 'customer', email: 'owner@example.com' });
    expect(await checkMarketingEligibility(ACTIVE_OUTREACH)).toEqual({ eligible: false, reason: 'business_customer' });
  });

  it('is NOT stopped by a cancelled business status (not in the spec stop-condition list)', async () => {
    mockGetBusinessById.mockResolvedValue({ businessId: 'biz_1', status: 'cancelled', email: 'owner@example.com' });
    expect(await checkMarketingEligibility(ACTIVE_OUTREACH)).toEqual({ eligible: true, targetEmail: 'owner@example.com' });
  });

  it('is ineligible when the business has no usable email address', async () => {
    mockGetBusinessById.mockResolvedValue({ businessId: 'biz_1', status: 'outreach' });
    expect(await checkMarketingEligibility(ACTIVE_OUTREACH)).toEqual({ eligible: false, reason: 'no_email_address' });
  });

  it('is ineligible when the target email is unsubscribed', async () => {
    mockGetMarketingSuppression.mockResolvedValue({ reason: 'unsubscribed' });
    expect(await checkMarketingEligibility(ACTIVE_OUTREACH)).toEqual({ eligible: false, reason: 'suppressed', suppressionReason: 'unsubscribed' });
  });

  it('is ineligible when the target email hard-bounced', async () => {
    mockGetMarketingSuppression.mockResolvedValue({ reason: 'hard_bounce' });
    expect(await checkMarketingEligibility(ACTIVE_OUTREACH)).toEqual({ eligible: false, reason: 'suppressed', suppressionReason: 'hard_bounce' });
  });

  it('is ineligible when the target email complained', async () => {
    mockGetMarketingSuppression.mockResolvedValue({ reason: 'complaint' });
    expect(await checkMarketingEligibility(ACTIVE_OUTREACH)).toEqual({ eligible: false, reason: 'suppressed', suppressionReason: 'complaint' });
  });

  it('is ineligible when an admin manually suppressed the business', async () => {
    mockGetMarketingSuppression.mockResolvedValue({ reason: 'admin' });
    expect(await checkMarketingEligibility(ACTIVE_OUTREACH)).toEqual({ eligible: false, reason: 'suppressed', suppressionReason: 'admin' });
  });

  it('is ineligible once the postcard has been engaged (QR scanned)', async () => {
    mockGetCampaignRecipientById.mockResolvedValue({ totalScans: 3 });
    expect(await checkMarketingEligibility(ACTIVE_OUTREACH)).toEqual({ eligible: false, reason: 'postcard_engaged' });
  });

  it('does not check postcard engagement when there is no CampaignRecipient (a single-postcard test send)', async () => {
    const result = await checkMarketingEligibility({ ...ACTIVE_OUTREACH, campaignRecipientId: undefined });
    expect(mockGetCampaignRecipientById).not.toHaveBeenCalled();
    expect(result).toEqual({ eligible: true, targetEmail: 'owner@example.com' });
  });
});
