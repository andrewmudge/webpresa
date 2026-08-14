/**
 * Unit tests for POST /api/internal/scan/capture-screenshot.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockVerifyInternalRequest = vi.hoisted(() => vi.fn());
const mockCaptureExistingSiteScreenshot = vi.hoisted(() => vi.fn());
const mockCaptureGeneratedPreviewScreenshot = vi.hoisted(() => vi.fn());

vi.mock('@/lib/internal-auth', () => ({ verifyInternalRequest: mockVerifyInternalRequest }));
vi.mock('@/lib/screenshots/capture', () => ({
  captureExistingSiteScreenshot: mockCaptureExistingSiteScreenshot,
  captureGeneratedPreviewScreenshot: mockCaptureGeneratedPreviewScreenshot,
}));

import { POST } from '@/app/api/internal/scan/capture-screenshot/route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/internal/scan/capture-screenshot', { method: 'POST', body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyInternalRequest.mockResolvedValue(true);
});

describe('POST /api/internal/scan/capture-screenshot', () => {
  it('returns 401 when unauthenticated', async () => {
    mockVerifyInternalRequest.mockResolvedValueOnce(false);
    const res = await POST(makeRequest({ businessId: 'biz_1', target: 'existing_site' }));
    expect(res.status).toBe(401);
  });

  it('calls captureExistingSiteScreenshot for target=existing_site', async () => {
    mockCaptureExistingSiteScreenshot.mockResolvedValueOnce({ status: 'queued', scanId: 'scan_1' });

    const res = await POST(makeRequest({ businessId: 'biz_1', target: 'existing_site' }));

    expect(mockCaptureExistingSiteScreenshot).toHaveBeenCalledWith('biz_1');
    expect(mockCaptureGeneratedPreviewScreenshot).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ status: 'queued', scanId: 'scan_1' });
  });

  it('calls captureGeneratedPreviewScreenshot for target=generated_preview', async () => {
    mockCaptureGeneratedPreviewScreenshot.mockResolvedValueOnce({ status: 'queued', scanId: 'scan_2' });

    const res = await POST(makeRequest({ businessId: 'biz_1', target: 'generated_preview' }));

    expect(mockCaptureGeneratedPreviewScreenshot).toHaveBeenCalledWith('biz_1');
    expect(mockCaptureExistingSiteScreenshot).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ status: 'queued', scanId: 'scan_2' });
  });
});
