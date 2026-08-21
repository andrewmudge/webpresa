/**
 * Unit tests for the daily drip-campaign cron sweep. Mirrors
 * `app/api/internal/leads/retry-notifications/__tests__` conventions where
 * they exist — verifies auth, and that one item's failure never aborts the
 * rest of the sweep.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockVerifyVercelCronRequest, mockListDueOutreach, mockAttemptSendForOutreach } = vi.hoisted(() => ({
  mockVerifyVercelCronRequest: vi.fn(),
  mockListDueOutreach: vi.fn(),
  mockAttemptSendForOutreach: vi.fn(),
}));

vi.mock('@/lib/internal-auth', () => ({ verifyVercelCronRequest: mockVerifyVercelCronRequest }));
vi.mock('@/lib/db/marketing-outreach', () => ({ listDueOutreach: mockListDueOutreach }));
vi.mock('@/lib/marketing/send', () => ({ attemptSendForOutreach: mockAttemptSendForOutreach }));

import { GET } from '@/app/api/internal/marketing/send-due-emails/route';

function makeRequest() {
  return new Request('https://example.test/api/internal/marketing/send-due-emails');
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/internal/marketing/send-due-emails', () => {
  it('returns 401 when the cron secret does not verify', async () => {
    mockVerifyVercelCronRequest.mockResolvedValue(false);
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
    expect(mockListDueOutreach).not.toHaveBeenCalled();
  });

  it('sends every due item and reports counts by outcome', async () => {
    mockVerifyVercelCronRequest.mockResolvedValue(true);
    mockListDueOutreach.mockResolvedValue([
      { businessId: 'biz_1', marketingCampaignId: 'mktgcampaign_postcard_followup' },
      { businessId: 'biz_2', marketingCampaignId: 'mktgcampaign_postcard_followup' },
      { businessId: 'biz_3', marketingCampaignId: 'mktgcampaign_postcard_followup' },
    ]);
    mockAttemptSendForOutreach
      .mockResolvedValueOnce({ outcome: 'sent' })
      .mockResolvedValueOnce({ outcome: 'skipped' })
      .mockResolvedValueOnce({ outcome: 'failed' });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ due: 3, sent: 1, skipped: 1, failed: 1 });
  });

  it('one item throwing does not abort the rest of the sweep', async () => {
    mockVerifyVercelCronRequest.mockResolvedValue(true);
    mockListDueOutreach.mockResolvedValue([
      { businessId: 'biz_1', marketingCampaignId: 'mktgcampaign_postcard_followup' },
      { businessId: 'biz_2', marketingCampaignId: 'mktgcampaign_postcard_followup' },
    ]);
    mockAttemptSendForOutreach.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ outcome: 'sent' });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockAttemptSendForOutreach).toHaveBeenCalledTimes(2);
    expect(body).toEqual({ due: 2, sent: 1, skipped: 0, failed: 1 });
  });

  it('reports zero counts when nothing is due', async () => {
    mockVerifyVercelCronRequest.mockResolvedValue(true);
    mockListDueOutreach.mockResolvedValue([]);
    const response = await GET(makeRequest());
    const body = await response.json();
    expect(body).toEqual({ due: 0, sent: 0, skipped: 0, failed: 0 });
    expect(mockAttemptSendForOutreach).not.toHaveBeenCalled();
  });
});
