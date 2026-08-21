/**
 * Unit tests for the click-tracking redirect route. An invalid/tampered
 * token is a 404 (no enumeration/guessing concern — see the token's own
 * doc comment), and a valid token redirects and records the click without
 * ever blocking on the rollup update.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const { mockDecodeClickToken, mockPutMarketingClick, mockRecordMarketingMessageClickRollup } = vi.hoisted(() => ({
  mockDecodeClickToken: vi.fn(),
  mockPutMarketingClick: vi.fn(),
  mockRecordMarketingMessageClickRollup: vi.fn(),
}));

vi.mock('@/lib/marketing/click-token', () => ({ decodeClickToken: mockDecodeClickToken }));
vi.mock('@/lib/db/marketing-clicks', () => ({ putMarketingClick: mockPutMarketingClick }));
vi.mock('@/lib/db/marketing-messages', () => ({ recordMarketingMessageClickRollup: mockRecordMarketingMessageClickRollup }));

import { GET } from '@/app/e/[token]/route';

const PAYLOAD = {
  messageId: 'mktgmsg_1',
  businessId: 'biz_1',
  marketingCampaignId: 'mktgcampaign_postcard_followup',
  emailSequence: 1 as const,
  linkLabel: 'preview',
  destinationUrl: 'https://webpresa.com/b/some-plumber',
};

function makeRequest(token: string) {
  return new NextRequest(`https://example.test/e/${token}`, { headers: { 'user-agent': 'test-agent' } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /e/[token]', () => {
  it('returns 404 for a tampered/invalid token — never resurrects it as a redirect', async () => {
    mockDecodeClickToken.mockResolvedValue(null);
    const response = await GET(makeRequest('tampered'), { params: Promise.resolve({ token: 'tampered' }) });
    expect(response.status).toBe(404);
    expect(mockPutMarketingClick).not.toHaveBeenCalled();
  });

  it('records the click and redirects to the destination for a valid token', async () => {
    mockDecodeClickToken.mockResolvedValue(PAYLOAD);
    mockRecordMarketingMessageClickRollup.mockResolvedValue(undefined);

    const response = await GET(makeRequest('valid'), { params: Promise.resolve({ token: 'valid' }) });

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(PAYLOAD.destinationUrl);
    expect(mockPutMarketingClick).toHaveBeenCalledWith(expect.objectContaining({ messageId: PAYLOAD.messageId, businessId: PAYLOAD.businessId, destinationUrl: PAYLOAD.destinationUrl }));
    expect(mockRecordMarketingMessageClickRollup).toHaveBeenCalledWith(PAYLOAD.businessId, `${PAYLOAD.marketingCampaignId}#${PAYLOAD.emailSequence}`, expect.any(String));
  });

  it('still redirects even when the best-effort rollup update fails', async () => {
    mockDecodeClickToken.mockResolvedValue(PAYLOAD);
    mockRecordMarketingMessageClickRollup.mockRejectedValue(new Error('conditional check failed'));

    const response = await GET(makeRequest('valid'), { params: Promise.resolve({ token: 'valid' }) });

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(PAYLOAD.destinationUrl);
  });
});
