/**
 * Unit tests for the public business-asset proxy route.
 * S3 access is mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAsset = vi.hoisted(() => vi.fn());

vi.mock('@/lib/s3/assets', () => ({
  getAsset: mockGetAsset,
}));

import { GET } from '@/app/api/assets/[...key]/route';

function makeParams(key: string[]): { params: Promise<{ key: string[] }> } {
  return { params: Promise.resolve({ key }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/assets/[...key]', () => {
  it('serves a businesses/ asset with an inferred content type and long cache headers', async () => {
    const body = Buffer.from('fake-png-bytes');
    mockGetAsset.mockResolvedValueOnce(body);

    const res = await GET(new Request('http://localhost/api/assets/businesses/biz_1/assets/logo.png'), {
      params: Promise.resolve({ key: ['businesses', 'biz_1', 'assets', 'logo.png'] }),
    });

    expect(mockGetAsset).toHaveBeenCalledWith('businesses/biz_1/assets/logo.png');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
  });

  it('returns 404 when the object does not exist', async () => {
    mockGetAsset.mockResolvedValueOnce(null);

    const res = await GET(
      new Request('http://localhost/api/assets/businesses/biz_1/assets/missing.png'),
      makeParams(['businesses', 'biz_1', 'assets', 'missing.png']),
    );

    expect(res.status).toBe(404);
  });

  it('rejects keys outside the businesses/ prefix without calling S3', async () => {
    const res = await GET(
      new Request('http://localhost/api/assets/scans/biz_1/scan_1/crawl.json'),
      makeParams(['scans', 'biz_1', 'scan_1', 'crawl.json']),
    );

    expect(res.status).toBe(404);
    expect(mockGetAsset).not.toHaveBeenCalled();
  });

  it('serves an accepted Stage 13 scan image under scans/.../images/', async () => {
    mockGetAsset.mockResolvedValueOnce(Buffer.from('fake-jpeg-bytes'));

    const res = await GET(
      new Request('http://localhost/api/assets/scans/biz_1/scan_1/images/img1.jpg'),
      makeParams(['scans', 'biz_1', 'scan_1', 'images', 'img1.jpg']),
    );

    expect(mockGetAsset).toHaveBeenCalledWith('scans/biz_1/scan_1/images/img1.jpg');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/jpeg');
  });

  it('still rejects the private crawl.json/extracted.json artifacts in the same scan folder as the served images', async () => {
    const crawlRes = await GET(
      new Request('http://localhost/api/assets/scans/biz_1/scan_1/crawl.json'),
      makeParams(['scans', 'biz_1', 'scan_1', 'crawl.json']),
    );
    const extractedRes = await GET(
      new Request('http://localhost/api/assets/scans/biz_1/scan_1/extracted.json'),
      makeParams(['scans', 'biz_1', 'scan_1', 'extracted.json']),
    );

    expect(crawlRes.status).toBe(404);
    expect(extractedRes.status).toBe(404);
    expect(mockGetAsset).not.toHaveBeenCalled();
  });

  it('infers content type for jpeg photos', async () => {
    mockGetAsset.mockResolvedValueOnce(Buffer.from('x'));
    const res = await GET(
      new Request('http://localhost/api/assets/businesses/biz_1/assets/photos/1.jpg'),
      makeParams(['businesses', 'biz_1', 'assets', 'photos', '1.jpg']),
    );
    expect(res.headers.get('Content-Type')).toBe('image/jpeg');
  });
});
