/**
 * Unit tests for scan image ingestion. `sharp`, `putAsset`, `fetch`, and the
 * SSRF guard are all mocked — no real network, S3, or image decoding.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPutAsset, mockValidateOutboundUrl, mockSharpMetadata } = vi.hoisted(() => ({
  mockPutAsset: vi.fn(),
  mockValidateOutboundUrl: vi.fn(),
  mockSharpMetadata: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/s3/assets', () => ({ putAsset: mockPutAsset }));
vi.mock('@/lib/security/url-validation', () => ({ validateOutboundUrl: mockValidateOutboundUrl }));
vi.mock('sharp', () => ({ default: () => ({ metadata: mockSharpMetadata }) }));

import { ingestScanImages } from '../images';

function textResponse(overrides: Partial<Response> = {}) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'image/jpeg', 'content-length': '1000' }),
    arrayBuffer: async () => new ArrayBuffer(1000),
    ...overrides,
  } as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockValidateOutboundUrl.mockImplementation(async (url: string) => ({ ok: true, normalizedUrl: url }));
  mockPutAsset.mockResolvedValue(undefined);
});

describe('ingestScanImages', () => {
  it('accepts a hero-quality image and uploads it under the scan images prefix', async () => {
    mockSharpMetadata.mockResolvedValue({ width: 1920, height: 1080 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse()));

    const results = await ingestScanImages({
      businessId: 'biz_1',
      scanId: 'scan_1',
      candidateUrls: ['https://example.com/hero.jpg'],
    });

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('accepted');
    expect(results[0].s3Key).toBe('scans/biz_1/scan_1/images/' + results[0].imageId + '.jpg');
    expect(mockPutAsset).toHaveBeenCalledWith(results[0].s3Key, expect.any(Buffer), 'image/jpeg');
    vi.unstubAllGlobals();
  });

  it('accepts the non-standard image/jpg content type, normalizing it to image/jpeg for storage (real-world CDN regression)', async () => {
    mockSharpMetadata.mockResolvedValue({ width: 1920, height: 1080 });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(textResponse({ headers: new Headers({ 'content-type': 'image/jpg', 'content-length': '1000' }) })),
    );

    const results = await ingestScanImages({
      businessId: 'biz_1',
      scanId: 'scan_1',
      candidateUrls: ['https://example.com/hero-1920w.jpg'],
    });

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('accepted');
    expect(results[0].contentType).toBe('image/jpeg');
    expect(mockPutAsset).toHaveBeenCalledWith(expect.any(String), expect.any(Buffer), 'image/jpeg');
    vi.unstubAllGlobals();
  });

  it('rejects an SSRF-blocked candidate URL without fetching it', async () => {
    mockValidateOutboundUrl.mockResolvedValue({ ok: false, reason: 'private_or_blocked_address' });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const results = await ingestScanImages({
      businessId: 'biz_1',
      scanId: 'scan_1',
      candidateUrls: ['http://169.254.169.254/secret.jpg'],
    });

    expect(results).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('rejects a URL matching a tracking-pixel pattern without fetching it', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const results = await ingestScanImages({
      businessId: 'biz_1',
      scanId: 'scan_1',
      candidateUrls: ['https://example.com/pixel.gif'],
    });

    expect(results).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('rejects an unsupported content type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(textResponse({ headers: new Headers({ 'content-type': 'image/svg+xml' }) })),
    );

    const results = await ingestScanImages({
      businessId: 'biz_1',
      scanId: 'scan_1',
      candidateUrls: ['https://example.com/icon.svg'],
    });

    expect(results).toHaveLength(0);
    vi.unstubAllGlobals();
  });

  it('marks a small real photo as review_required rather than accepted, but still stores it for later admin review/promotion', async () => {
    mockSharpMetadata.mockResolvedValue({ width: 200, height: 150 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse()));

    const results = await ingestScanImages({
      businessId: 'biz_1',
      scanId: 'scan_1',
      candidateUrls: ['https://example.com/small-photo.jpg'],
    });

    expect(results[0].status).toBe('review_required');
    expect(results[0].url).toBe('/api/assets/scans/biz_1/scan_1/images/' + results[0].imageId + '.jpg');
    expect(mockPutAsset).toHaveBeenCalledWith(results[0].s3Key, expect.any(Buffer), 'image/jpeg');
    vi.unstubAllGlobals();
  });

  it('rejects an icon-sized image outright (likely a tracking pixel or favicon)', async () => {
    mockSharpMetadata.mockResolvedValue({ width: 16, height: 16 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse()));

    const results = await ingestScanImages({
      businessId: 'biz_1',
      scanId: 'scan_1',
      candidateUrls: ['https://example.com/tiny.jpg'],
    });

    expect(results).toHaveLength(0);
    vi.unstubAllGlobals();
  });

  it('never fails the whole batch when one candidate throws', async () => {
    mockSharpMetadata.mockResolvedValue({ width: 1920, height: 1080 });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce(textResponse()),
    );

    const results = await ingestScanImages({
      businessId: 'biz_1',
      scanId: 'scan_1',
      candidateUrls: ['https://example.com/broken.jpg', 'https://example.com/good.jpg'],
    });

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('accepted');
    vi.unstubAllGlobals();
  });

  it('rejects an oversized image via Content-Length before downloading the body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        textResponse({ headers: new Headers({ 'content-type': 'image/jpeg', 'content-length': String(20 * 1024 * 1024) }) }),
      ),
    );

    const results = await ingestScanImages({
      businessId: 'biz_1',
      scanId: 'scan_1',
      candidateUrls: ['https://example.com/huge.jpg'],
    });

    expect(results).toHaveLength(0);
    vi.unstubAllGlobals();
  });

  it('caps accepted images at the configured maximum', async () => {
    mockSharpMetadata.mockResolvedValue({ width: 1920, height: 1080 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse()));

    const candidateUrls = Array.from({ length: 15 }, (_, i) => `https://example.com/photo-${i}.jpg`);
    const results = await ingestScanImages({ businessId: 'biz_1', scanId: 'scan_1', candidateUrls });

    const accepted = results.filter((r) => r.status === 'accepted');
    expect(accepted.length).toBeLessThanOrEqual(8);
    vi.unstubAllGlobals();
  });
});
