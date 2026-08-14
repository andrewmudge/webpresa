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

  it('delegates to enrichBusinessWebsite and returns its outcome verbatim', async () => {
    mockEnrichBusinessWebsite.mockResolvedValueOnce({ status: 'completed', scanId: 'scan_1', previewId: 'preview_1' });

    const res = await POST(makeRequest({ businessId: 'biz_1' }));

    expect(mockEnrichBusinessWebsite).toHaveBeenCalledWith('biz_1');
    expect(await res.json()).toEqual({ status: 'completed', scanId: 'scan_1', previewId: 'preview_1' });
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
});
