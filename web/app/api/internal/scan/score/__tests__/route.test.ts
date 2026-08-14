/**
 * Unit tests for POST /api/internal/scan/score.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockVerifyInternalRequest = vi.hoisted(() => vi.fn());
const mockScoreBusinessWebsite = vi.hoisted(() => vi.fn());
const mockGetBusinessById = vi.hoisted(() => vi.fn());

vi.mock('@/lib/internal-auth', () => ({ verifyInternalRequest: mockVerifyInternalRequest }));
vi.mock('@/lib/scoring/score-business', () => ({ scoreBusinessWebsite: mockScoreBusinessWebsite }));
vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById }));

import { POST } from '@/app/api/internal/scan/score/route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/internal/scan/score', { method: 'POST', body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyInternalRequest.mockResolvedValue(true);
});

describe('POST /api/internal/scan/score', () => {
  it('returns 401 when unauthenticated', async () => {
    mockVerifyInternalRequest.mockResolvedValueOnce(false);
    const res = await POST(makeRequest({ businessId: 'biz_1' }));
    expect(res.status).toBe(401);
    expect(mockScoreBusinessWebsite).not.toHaveBeenCalled();
  });

  it('merges the scoring outcome with the resulting qualification/leadPriority/score read-back', async () => {
    mockScoreBusinessWebsite.mockResolvedValueOnce({ status: 'completed', scanId: 'scan_1' });
    mockGetBusinessById.mockResolvedValueOnce({ qualification: 'qualified', leadPriority: 'high', websiteQualityScore: 82 });

    const res = await POST(makeRequest({ businessId: 'biz_1' }));

    expect(await res.json()).toEqual({
      status: 'completed',
      scanId: 'scan_1',
      qualification: 'qualified',
      leadPriority: 'high',
      websiteQualityScore: 82,
    });
  });

  it('reports null qualification fields when the business has none yet', async () => {
    mockScoreBusinessWebsite.mockResolvedValueOnce({ status: 'not_eligible', message: 'Run Firecrawl enrichment first.' });
    mockGetBusinessById.mockResolvedValueOnce({});

    const res = await POST(makeRequest({ businessId: 'biz_1' }));

    const body = await res.json();
    expect(body.qualification).toBeNull();
    expect(body.leadPriority).toBeNull();
    expect(body.websiteQualityScore).toBeNull();
  });
});
