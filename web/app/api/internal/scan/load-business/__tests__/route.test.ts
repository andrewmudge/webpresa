/**
 * Unit tests for POST /api/internal/scan/load-business.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockVerifyInternalRequest = vi.hoisted(() => vi.fn());
const mockGetBusinessById = vi.hoisted(() => vi.fn());

vi.mock('@/lib/internal-auth', () => ({ verifyInternalRequest: mockVerifyInternalRequest }));
vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById }));

import { POST } from '@/app/api/internal/scan/load-business/route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/internal/scan/load-business', { method: 'POST', body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyInternalRequest.mockResolvedValue(true);
});

describe('POST /api/internal/scan/load-business', () => {
  it('returns 401 when unauthenticated', async () => {
    mockVerifyInternalRequest.mockResolvedValueOnce(false);
    const res = await POST(makeRequest({ businessId: 'biz_1' }));
    expect(res.status).toBe(401);
    expect(mockGetBusinessById).not.toHaveBeenCalled();
  });

  it('reports found: false when the business does not exist', async () => {
    mockGetBusinessById.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ businessId: 'biz_missing' }));
    expect(await res.json()).toEqual({ found: false });
  });

  it('reports hasWebsite: true when websiteUrl is set', async () => {
    mockGetBusinessById.mockResolvedValueOnce({ websiteUrl: 'https://acme.com' });
    const res = await POST(makeRequest({ businessId: 'biz_1' }));
    expect(await res.json()).toEqual({ found: true, hasWebsite: true });
  });

  it('reports hasWebsite: false when websiteUrl is unset or blank', async () => {
    mockGetBusinessById.mockResolvedValueOnce({ websiteUrl: '   ' });
    const res = await POST(makeRequest({ businessId: 'biz_1' }));
    expect(await res.json()).toEqual({ found: true, hasWebsite: false });
  });
});
