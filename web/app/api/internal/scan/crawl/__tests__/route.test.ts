/**
 * Unit tests for POST /api/internal/scan/crawl.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockVerifyInternalRequest = vi.hoisted(() => vi.fn());
const mockEnrichBusinessWebsite = vi.hoisted(() => vi.fn());

vi.mock('@/lib/internal-auth', () => ({ verifyInternalRequest: mockVerifyInternalRequest }));
vi.mock('@/lib/firecrawl/enrich-business', () => ({ enrichBusinessWebsite: mockEnrichBusinessWebsite }));

import { POST } from '@/app/api/internal/scan/crawl/route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/internal/scan/crawl', { method: 'POST', body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyInternalRequest.mockResolvedValue(true);
});

describe('POST /api/internal/scan/crawl', () => {
  it('returns 401 when unauthenticated', async () => {
    mockVerifyInternalRequest.mockResolvedValueOnce(false);
    const res = await POST(makeRequest({ businessId: 'biz_1' }));
    expect(res.status).toBe(401);
    expect(mockEnrichBusinessWebsite).not.toHaveBeenCalled();
  });

  it('delegates to enrichBusinessWebsite and normalizes the missing message key to null', async () => {
    mockEnrichBusinessWebsite.mockResolvedValueOnce({ status: 'completed', scanId: 'scan_1', previewId: 'preview_1' });

    const res = await POST(makeRequest({ businessId: 'biz_1' }));

    expect(mockEnrichBusinessWebsite).toHaveBeenCalledWith('biz_1');
    expect(await res.json()).toEqual({ status: 'completed', scanId: 'scan_1', previewId: 'preview_1', message: null });
  });

  it('reports message as null (not an omitted key) on a completed outcome with none — the exact 2026-08-27 States.Runtime crash', async () => {
    // FinalizeCrawlFailedManualReview's manualReviewReason.$ reads
    // $.crawlResult.ResponseBody.message — a truly-absent key (not just a
    // missing value) throws States.Runtime, not a graceful branch.
    mockEnrichBusinessWebsite.mockResolvedValueOnce({ status: 'completed', scanId: 'scan_1', previewId: 'preview_1' });

    const res = await POST(makeRequest({ businessId: 'biz_1' }));
    const body = await res.json();

    expect(body).toHaveProperty('message');
    expect(body.message).toBeNull();
  });

  it('passes through the no-website manual_approval_required outcome unchanged', async () => {
    mockEnrichBusinessWebsite.mockResolvedValueOnce({
      status: 'manual_approval_required',
      scanId: 'scan_2',
      message: 'No website was available for Firecrawl enrichment.',
    });

    const res = await POST(makeRequest({ businessId: 'biz_2' }));

    const body = await res.json();
    expect(body.status).toBe('manual_approval_required');
  });

  it('reports previewId as null (not an omitted key) when no preview was generated', async () => {
    // The Step Functions state machine's `sfn.JsonPath.stringAt(...previewId)`
    // references (`FinalizeReject`/`FinalizeManualReviewFromScore`) throw a
    // States.Runtime error on a truly-absent JSON key, not just a missing
    // value — so this key must always be present, same as the score route's
    // qualification/leadPriority normalization.
    mockEnrichBusinessWebsite.mockResolvedValueOnce({
      status: 'failed',
      scanId: 'scan_3',
      failureCategory: 'website_unreachable',
      message: 'Could not reach the website.',
    });

    const res = await POST(makeRequest({ businessId: 'biz_3' }));

    const body = await res.json();
    expect(body).toHaveProperty('previewId');
    expect(body.previewId).toBeNull();
  });
});
