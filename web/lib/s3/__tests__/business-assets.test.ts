/**
 * Unit tests for `lib/s3/business-assets.ts`. This module previously had no
 * test coverage at all — added alongside the favicon feature, scoped to the
 * functions that feature touches (the pre-existing `appendBusinessPhotos`/
 * `assetKeyFromUrl` stay uncovered here, out of scope for this addition).
 * All S3/sharp interactions are mocked — no real AWS calls or image decoding.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockPutAsset, mockGetAsset, mockValidateImageUpload, mockGenerateFaviconBuffer } = vi.hoisted(() => ({
  mockPutAsset: vi.fn(),
  mockGetAsset: vi.fn(),
  mockValidateImageUpload: vi.fn(),
  mockGenerateFaviconBuffer: vi.fn(),
}));

vi.mock('@/lib/s3/assets', () => ({
  putAsset: mockPutAsset,
  getAsset: mockGetAsset,
}));

vi.mock('@/lib/s3/upload-validation', () => ({
  validateImageUpload: mockValidateImageUpload,
}));

vi.mock('@/lib/image/favicon', () => ({
  generateFaviconBuffer: mockGenerateFaviconBuffer,
}));

import {
  uploadBusinessAsset,
  uploadBusinessAssetWithBuffer,
  putBusinessAssetBuffer,
  regenerateBusinessFavicon,
  regenerateFaviconFromLogoUrl,
  assetKeyFromUrl,
} from '@/lib/s3/business-assets';

const BUSINESS_ID = 'biz_1';

function makeFile(name = 'logo.png'): File {
  return new File(['fake-bytes'], name, { type: 'image/png' });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPutAsset.mockResolvedValue(undefined);
});

describe('uploadBusinessAssetWithBuffer', () => {
  it('validates, uploads under the business asset prefix, and returns both the URL and decoded bytes', async () => {
    mockValidateImageUpload.mockResolvedValue({ buffer: Buffer.from('decoded-bytes'), contentType: 'image/png', extension: 'png' });

    const result = await uploadBusinessAssetWithBuffer(BUSINESS_ID, makeFile(), 'logo');

    expect(mockPutAsset).toHaveBeenCalledWith('businesses/biz_1/assets/logo.png', Buffer.from('decoded-bytes'), 'image/png');
    expect(result).toEqual({ url: '/api/assets/businesses/biz_1/assets/logo.png', buffer: Buffer.from('decoded-bytes') });
  });
});

describe('uploadBusinessAsset', () => {
  it('preserves its original URL-only return shape (thin wrapper over uploadBusinessAssetWithBuffer)', async () => {
    mockValidateImageUpload.mockResolvedValue({ buffer: Buffer.from('decoded-bytes'), contentType: 'image/jpeg', extension: 'jpg' });

    const url = await uploadBusinessAsset(BUSINESS_ID, makeFile('photo.jpg'), 'photos/abc');

    expect(url).toBe('/api/assets/businesses/biz_1/assets/photos/abc.jpg');
  });
});

describe('putBusinessAssetBuffer', () => {
  it('uploads already-decoded bytes under the given key prefix and extension', async () => {
    const url = await putBusinessAssetBuffer(BUSINESS_ID, Buffer.from('png-bytes'), 'image/png', 'png', 'favicon');

    expect(mockPutAsset).toHaveBeenCalledWith('businesses/biz_1/assets/favicon.png', Buffer.from('png-bytes'), 'image/png');
    expect(url).toBe('/api/assets/businesses/biz_1/assets/favicon.png');
  });
});

describe('regenerateBusinessFavicon', () => {
  it('runs the logo buffer through generateFaviconBuffer and stores it at the fixed favicon.png key', async () => {
    mockGenerateFaviconBuffer.mockResolvedValue(Buffer.from('favicon-png-bytes'));

    const url = await regenerateBusinessFavicon(BUSINESS_ID, Buffer.from('logo-bytes'));

    expect(mockGenerateFaviconBuffer).toHaveBeenCalledWith(Buffer.from('logo-bytes'));
    expect(mockPutAsset).toHaveBeenCalledWith('businesses/biz_1/assets/favicon.png', Buffer.from('favicon-png-bytes'), 'image/png');
    expect(url).toBe('/api/assets/businesses/biz_1/assets/favicon.png');
  });
});

describe('regenerateFaviconFromLogoUrl', () => {
  it('resolves the S3 key, reads it, and regenerates the favicon', async () => {
    mockGetAsset.mockResolvedValue(Buffer.from('logo-bytes'));
    mockGenerateFaviconBuffer.mockResolvedValue(Buffer.from('favicon-png-bytes'));

    const url = await regenerateFaviconFromLogoUrl(BUSINESS_ID, '/api/assets/businesses/biz_1/assets/logo.png');

    expect(mockGetAsset).toHaveBeenCalledWith('businesses/biz_1/assets/logo.png');
    expect(url).toBe('/api/assets/businesses/biz_1/assets/favicon.png');
  });

  it('returns undefined when the URL is not one of our own assets', async () => {
    const url = await regenerateFaviconFromLogoUrl(BUSINESS_ID, 'https://cdn.example.com/logo.png');
    expect(url).toBeUndefined();
    expect(mockGetAsset).not.toHaveBeenCalled();
    expect(mockGenerateFaviconBuffer).not.toHaveBeenCalled();
  });

  it('returns undefined when the S3 object is missing', async () => {
    mockGetAsset.mockResolvedValue(null);
    const url = await regenerateFaviconFromLogoUrl(BUSINESS_ID, '/api/assets/businesses/biz_1/assets/logo.png');
    expect(url).toBeUndefined();
    expect(mockGenerateFaviconBuffer).not.toHaveBeenCalled();
  });
});

describe('assetKeyFromUrl', () => {
  it('strips the /api/assets/ proxy prefix', () => {
    expect(assetKeyFromUrl('/api/assets/businesses/biz_1/assets/logo.png')).toBe('businesses/biz_1/assets/logo.png');
  });

  it('returns null for a URL outside our own asset proxy', () => {
    expect(assetKeyFromUrl('https://cdn.example.com/logo.png')).toBeNull();
  });
});
