/**
 * Unit tests for POST /api/internal/scan/generate-preview.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockVerifyInternalRequest = vi.hoisted(() => vi.fn());
const mockGenerateAndSaveWebsite = vi.hoisted(() => vi.fn());

vi.mock('@/lib/internal-auth', () => ({ verifyInternalRequest: mockVerifyInternalRequest }));
vi.mock('@/lib/ai/generate-and-save-preview', () => ({ generateAndSaveWebsite: mockGenerateAndSaveWebsite }));

import { POST } from '@/app/api/internal/scan/generate-preview/route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/internal/scan/generate-preview', { method: 'POST', body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyInternalRequest.mockResolvedValue(true);
});

describe('POST /api/internal/scan/generate-preview', () => {
  it('returns 401 when unauthenticated', async () => {
    mockVerifyInternalRequest.mockResolvedValueOnce(false);
    const res = await POST(makeRequest({ businessId: 'biz_1' }));
    expect(res.status).toBe(401);
    expect(mockGenerateAndSaveWebsite).not.toHaveBeenCalled();
  });

  it('delegates to generateAndSaveWebsite and normalizes the missing message key to null', async () => {
    mockGenerateAndSaveWebsite.mockResolvedValueOnce({ status: 'completed', previewId: 'preview_1' });

    const res = await POST(makeRequest({ businessId: 'biz_1' }));

    expect(mockGenerateAndSaveWebsite).toHaveBeenCalledWith('biz_1');
    expect(await res.json()).toEqual({ status: 'completed', previewId: 'preview_1', message: null });
  });

  it('passes through a not_eligible outcome and normalizes the missing previewId key to null', async () => {
    mockGenerateAndSaveWebsite.mockResolvedValueOnce({
      status: 'not_eligible',
      message: 'Add at least one service under "Services offered" before generating a website.',
    });

    const res = await POST(makeRequest({ businessId: 'biz_1' }));

    const body = await res.json();
    expect(body.status).toBe('not_eligible');
    expect(body).toHaveProperty('previewId');
    expect(body.previewId).toBeNull();
  });
});
