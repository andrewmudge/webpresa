/**
 * Unit tests for the public unsubscribe route. Security-relevant behavior:
 * an invalid token never distinguishes reasons (never a 500), and every
 * mutation is scoped to the outreach the token itself resolves to — a
 * token can never be used to affect a different business.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const { mockGetOutreachByUnsubscribeToken, mockTransitionOutreachToTerminal, mockGetBusinessById, mockPutMarketingSuppressionIfNotExists } = vi.hoisted(() => ({
  mockGetOutreachByUnsubscribeToken: vi.fn(),
  mockTransitionOutreachToTerminal: vi.fn(),
  mockGetBusinessById: vi.fn(),
  mockPutMarketingSuppressionIfNotExists: vi.fn(),
}));

vi.mock('@/lib/db/marketing-outreach', () => ({
  getOutreachByUnsubscribeToken: mockGetOutreachByUnsubscribeToken,
  transitionOutreachToTerminal: mockTransitionOutreachToTerminal,
}));
vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById }));
vi.mock('@/lib/db/marketing-suppressions', () => ({ putMarketingSuppressionIfNotExists: mockPutMarketingSuppressionIfNotExists }));

import { GET } from '@/app/unsubscribe/[token]/route';

function makeRequest(token: string) {
  return new NextRequest(`https://example.test/unsubscribe/${token}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetBusinessById.mockResolvedValue({ businessId: 'biz_1', email: 'owner@example.com' });
});

describe('GET /unsubscribe/[token]', () => {
  it('redirects to the generic invalid page for an unknown token — never a 500', async () => {
    mockGetOutreachByUnsubscribeToken.mockResolvedValue(null);
    const response = await GET(makeRequest('garbage-token'), { params: Promise.resolve({ token: 'garbage-token' }) });
    expect(response.status).toBe(307); // NextResponse.redirect default
    expect(response.headers.get('location')).toContain('/unsubscribe/invalid');
    expect(mockPutMarketingSuppressionIfNotExists).not.toHaveBeenCalled();
  });

  it('suppresses the resolved business email and redirects to confirmation', async () => {
    mockGetOutreachByUnsubscribeToken.mockResolvedValue({ businessId: 'biz_1', marketingCampaignId: 'mktgcampaign_postcard_followup', status: 'active' });
    const response = await GET(makeRequest('valid-token'), { params: Promise.resolve({ token: 'valid-token' }) });

    expect(response.headers.get('location')).toContain('/unsubscribe/confirmed');
    expect(mockPutMarketingSuppressionIfNotExists).toHaveBeenCalledWith(expect.objectContaining({ emailNormalized: 'owner@example.com', businessId: 'biz_1', reason: 'unsubscribed' }));
    expect(mockTransitionOutreachToTerminal).toHaveBeenCalledWith(
      expect.objectContaining({ businessId: 'biz_1', marketingCampaignId: 'mktgcampaign_postcard_followup', status: 'suppressed', suppressionReason: 'unsubscribed' }),
    );
  });

  it('only ever mutates the exact business the token resolves to — never a different business', async () => {
    mockGetOutreachByUnsubscribeToken.mockResolvedValue({ businessId: 'biz_the_actual_owner', marketingCampaignId: 'mktgcampaign_postcard_followup', status: 'active' });
    mockGetBusinessById.mockResolvedValue({ businessId: 'biz_the_actual_owner', email: 'realowner@example.com' });

    await GET(makeRequest('token-for-biz-owner'), { params: Promise.resolve({ token: 'token-for-biz-owner' }) });

    expect(mockGetBusinessById).toHaveBeenCalledWith('biz_the_actual_owner');
    expect(mockTransitionOutreachToTerminal).toHaveBeenCalledWith(expect.objectContaining({ businessId: 'biz_the_actual_owner' }));
  });

  it('is idempotent — a second visit on an already-suppressed outreach does not re-transition', async () => {
    mockGetOutreachByUnsubscribeToken.mockResolvedValue({ businessId: 'biz_1', marketingCampaignId: 'mktgcampaign_postcard_followup', status: 'suppressed' });
    const response = await GET(makeRequest('valid-token'), { params: Promise.resolve({ token: 'valid-token' }) });

    expect(response.headers.get('location')).toContain('/unsubscribe/confirmed');
    expect(mockTransitionOutreachToTerminal).not.toHaveBeenCalled();
    // The suppression write is itself idempotent (conditional put) even if attempted again.
    expect(mockPutMarketingSuppressionIfNotExists).toHaveBeenCalled();
  });
});
