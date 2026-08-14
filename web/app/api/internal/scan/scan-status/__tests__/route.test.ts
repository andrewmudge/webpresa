/**
 * Unit tests for GET /api/internal/scan/scan-status.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockVerifyInternalRequest = vi.hoisted(() => vi.fn());
const mockGetScanEventById = vi.hoisted(() => vi.fn());

vi.mock('@/lib/internal-auth', () => ({ verifyInternalRequest: mockVerifyInternalRequest }));
vi.mock('@/lib/db/scan-events', () => ({ getScanEventById: mockGetScanEventById }));

import { GET } from '@/app/api/internal/scan/scan-status/route';

function makeRequest(query: string): Request {
  return new Request(`http://localhost/api/internal/scan/scan-status${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyInternalRequest.mockResolvedValue(true);
});

describe('GET /api/internal/scan/scan-status', () => {
  it('returns 401 when unauthenticated', async () => {
    mockVerifyInternalRequest.mockResolvedValueOnce(false);
    const res = await GET(makeRequest('?scanId=scan_1'));
    expect(res.status).toBe(401);
    expect(mockGetScanEventById).not.toHaveBeenCalled();
  });

  it('returns 400 when scanId is missing', async () => {
    const res = await GET(makeRequest(''));
    expect(res.status).toBe(400);
    expect(mockGetScanEventById).not.toHaveBeenCalled();
  });

  it('reports found: false when the scan does not exist', async () => {
    mockGetScanEventById.mockResolvedValueOnce(null);
    const res = await GET(makeRequest('?scanId=scan_missing'));
    expect(await res.json()).toEqual({ found: false });
  });

  it('reports status and failureCategory for an existing scan', async () => {
    mockGetScanEventById.mockResolvedValueOnce({ status: 'failed', failureCategory: 'navigation_timeout' });
    const res = await GET(makeRequest('?scanId=scan_1'));
    expect(await res.json()).toEqual({ found: true, status: 'failed', failureCategory: 'navigation_timeout' });
  });

  it('reports failureCategory: null for a completed scan', async () => {
    mockGetScanEventById.mockResolvedValueOnce({ status: 'completed' });
    const res = await GET(makeRequest('?scanId=scan_1'));
    expect(await res.json()).toEqual({ found: true, status: 'completed', failureCategory: null });
  });
});
