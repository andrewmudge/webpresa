/**
 * Unit tests for `lib/customer-editing/photos.ts`, scoped to the "Browser
 * tab icon" (favicon) feature: `updateCustomerLogo`'s new auto-regenerate
 * behavior, plus the new `updateCustomerFavicon`/`resetCustomerFavicon`.
 * This module had no prior test coverage — deliberately not backfilling
 * the rest of it here (photo slots, hero/about/etc.) to keep this addition
 * scoped to what this feature actually touches.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const {
  mockGetBusinessById,
  mockPutBusiness,
  mockUpdateBusiness,
  mockEnsureDraftPreview,
  mockPutSitePreview,
  mockUploadBusinessAsset,
  mockUploadBusinessAssetWithBuffer,
  mockAppendBusinessPhotos,
  mockAssetKeyFromUrl,
  mockDeleteAsset,
  mockRegenerateBusinessFavicon,
  mockRegenerateFaviconFromLogoUrl,
  mockValidateImageUpload,
  mockCheckHeroPhotoDimensions,
} = vi.hoisted(() => ({
  mockGetBusinessById: vi.fn(),
  mockPutBusiness: vi.fn(),
  mockUpdateBusiness: vi.fn(),
  mockEnsureDraftPreview: vi.fn(),
  mockPutSitePreview: vi.fn(),
  mockUploadBusinessAsset: vi.fn(),
  mockUploadBusinessAssetWithBuffer: vi.fn(),
  mockAppendBusinessPhotos: vi.fn(),
  mockAssetKeyFromUrl: vi.fn(),
  mockDeleteAsset: vi.fn(),
  mockRegenerateBusinessFavicon: vi.fn(),
  mockRegenerateFaviconFromLogoUrl: vi.fn(),
  mockValidateImageUpload: vi.fn(),
  mockCheckHeroPhotoDimensions: vi.fn(),
}));

const MockUploadValidationError = vi.hoisted(() => class extends Error {});

vi.mock('@/lib/db/businesses', () => ({
  getBusinessById: mockGetBusinessById,
  putBusiness: mockPutBusiness,
  updateBusiness: mockUpdateBusiness,
}));

vi.mock('@/lib/db/site-previews', () => ({
  ensureDraftPreview: mockEnsureDraftPreview,
  putSitePreview: mockPutSitePreview,
}));

vi.mock('@/lib/image/hero-dimensions', () => ({
  checkHeroPhotoDimensions: mockCheckHeroPhotoDimensions,
}));

vi.mock('@/lib/s3/business-assets', () => ({
  uploadBusinessAsset: mockUploadBusinessAsset,
  uploadBusinessAssetWithBuffer: mockUploadBusinessAssetWithBuffer,
  appendBusinessPhotos: mockAppendBusinessPhotos,
  assetKeyFromUrl: mockAssetKeyFromUrl,
  regenerateBusinessFavicon: mockRegenerateBusinessFavicon,
  regenerateFaviconFromLogoUrl: mockRegenerateFaviconFromLogoUrl,
}));

vi.mock('@/lib/s3/assets', () => ({
  deleteAsset: mockDeleteAsset,
}));

vi.mock('@/lib/s3/upload-validation', () => ({
  validateImageUpload: mockValidateImageUpload,
  UploadValidationError: MockUploadValidationError,
}));

import { updateCustomerLogo, updateCustomerFavicon, resetCustomerFavicon } from '@/lib/customer-editing/photos';

const BUSINESS_ID = 'biz_1';

function makeBusiness(overrides: Record<string, unknown> = {}) {
  return { businessId: BUSINESS_ID, ...overrides };
}

function makeFile(name = 'icon.png'): File {
  return new File(['fake-bytes'], name, { type: 'image/png' });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetBusinessById.mockResolvedValue(makeBusiness());
  mockUpdateBusiness.mockResolvedValue(undefined);
  mockPutBusiness.mockResolvedValue(undefined);
  mockUploadBusinessAssetWithBuffer.mockResolvedValue({
    url: '/api/assets/businesses/biz_1/assets/logo/new.png',
    buffer: Buffer.from('fake-logo-bytes'),
  });
  mockRegenerateBusinessFavicon.mockResolvedValue('/api/assets/businesses/biz_1/assets/favicon.png');
  mockRegenerateFaviconFromLogoUrl.mockResolvedValue('/api/assets/businesses/biz_1/assets/favicon.png');
  mockValidateImageUpload.mockResolvedValue({ buffer: Buffer.from('fake-favicon-bytes'), contentType: 'image/png', extension: 'png' });
});

describe('updateCustomerLogo — favicon regeneration', () => {
  it('regenerates the favicon from a freshly uploaded logo file when faviconSource is unset (auto)', async () => {
    const fd = new FormData();
    fd.set('logoPhotoFile', makeFile('logo.png'));

    const result = await updateCustomerLogo(BUSINESS_ID, fd);

    expect(mockRegenerateBusinessFavicon).toHaveBeenCalledWith(BUSINESS_ID, Buffer.from('fake-logo-bytes'));
    expect(mockRegenerateFaviconFromLogoUrl).not.toHaveBeenCalled();
    expect(result?.faviconUrl).toBe('/api/assets/businesses/biz_1/assets/favicon.png');
    expect(result?.faviconSource).toBe('auto');
    expect(mockUpdateBusiness).toHaveBeenCalledWith(BUSINESS_ID, {
      logoUrl: '/api/assets/businesses/biz_1/assets/logo/new.png',
      faviconUrl: '/api/assets/businesses/biz_1/assets/favicon.png',
      faviconSource: 'auto',
    });
  });

  it('regenerates the favicon via the existing logoUrl when a photo is picked from the gallery instead of uploaded', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness({ logoUrl: '/api/assets/businesses/biz_1/assets/photos/old.jpg' }));
    const fd = new FormData();
    fd.set('logoPhotoUrl', '/api/assets/businesses/biz_1/assets/photos/picked.jpg');

    const result = await updateCustomerLogo(BUSINESS_ID, fd);

    expect(mockRegenerateFaviconFromLogoUrl).toHaveBeenCalledWith(BUSINESS_ID, '/api/assets/businesses/biz_1/assets/photos/picked.jpg');
    expect(mockRegenerateBusinessFavicon).not.toHaveBeenCalled();
    expect(result?.faviconUrl).toBe('/api/assets/businesses/biz_1/assets/favicon.png');
  });

  it('does not regenerate the favicon when faviconSource is already manual', async () => {
    mockGetBusinessById.mockResolvedValue(
      makeBusiness({ faviconUrl: '/api/assets/businesses/biz_1/assets/custom.png', faviconSource: 'manual' }),
    );
    const fd = new FormData();
    fd.set('logoPhotoFile', makeFile('logo.png'));

    const result = await updateCustomerLogo(BUSINESS_ID, fd);

    expect(mockRegenerateBusinessFavicon).not.toHaveBeenCalled();
    expect(mockRegenerateFaviconFromLogoUrl).not.toHaveBeenCalled();
    expect(result?.faviconUrl).toBe('/api/assets/businesses/biz_1/assets/custom.png');
    expect(result?.faviconSource).toBe('manual');
  });

  it('is a no-op (including favicon) when the resolved logoUrl is unchanged', async () => {
    mockGetBusinessById.mockResolvedValue(
      makeBusiness({
        logoUrl: '/api/assets/businesses/biz_1/assets/photos/same.jpg',
        faviconUrl: '/api/assets/businesses/biz_1/assets/favicon.png',
        faviconSource: 'auto',
      }),
    );
    const fd = new FormData();
    fd.set('logoPhotoUrl', '/api/assets/businesses/biz_1/assets/photos/same.jpg');

    const result = await updateCustomerLogo(BUSINESS_ID, fd);

    expect(mockUpdateBusiness).not.toHaveBeenCalled();
    expect(mockRegenerateBusinessFavicon).not.toHaveBeenCalled();
    expect(mockRegenerateFaviconFromLogoUrl).not.toHaveBeenCalled();
    expect(result?.faviconUrl).toBe('/api/assets/businesses/biz_1/assets/favicon.png');
  });
});

describe('updateCustomerFavicon', () => {
  it('returns a message when no file is chosen', async () => {
    const result = await updateCustomerFavicon(BUSINESS_ID, new FormData());
    expect(result?.message).toMatch(/choose an image/i);
    expect(mockUpdateBusiness).not.toHaveBeenCalled();
  });

  it('uploads, regenerates, and marks the favicon manual', async () => {
    const fd = new FormData();
    fd.set('favicon', makeFile());

    const result = await updateCustomerFavicon(BUSINESS_ID, fd);

    expect(mockValidateImageUpload).toHaveBeenCalledWith(expect.any(File));
    expect(mockRegenerateBusinessFavicon).toHaveBeenCalledWith(BUSINESS_ID, Buffer.from('fake-favicon-bytes'));
    expect(result?.faviconUrl).toBe('/api/assets/businesses/biz_1/assets/favicon.png');
    expect(result?.faviconSource).toBe('manual');
    expect(mockUpdateBusiness).toHaveBeenCalledWith(BUSINESS_ID, {
      faviconUrl: '/api/assets/businesses/biz_1/assets/favicon.png',
      faviconSource: 'manual',
    });
  });

  it('surfaces an UploadValidationError message without persisting', async () => {
    mockValidateImageUpload.mockRejectedValue(new MockUploadValidationError('Unsupported file type.'));
    const fd = new FormData();
    fd.set('favicon', makeFile());

    const result = await updateCustomerFavicon(BUSINESS_ID, fd);

    expect(result?.message).toBe('Unsupported file type.');
    expect(mockUpdateBusiness).not.toHaveBeenCalled();
  });
});

describe('resetCustomerFavicon', () => {
  it('regenerates immediately from the current logo and marks the favicon auto', async () => {
    mockGetBusinessById.mockResolvedValue(
      makeBusiness({
        logoUrl: '/api/assets/businesses/biz_1/assets/logo/current.png',
        faviconUrl: '/api/assets/businesses/biz_1/assets/custom.png',
        faviconSource: 'manual',
      }),
    );

    const result = await resetCustomerFavicon(BUSINESS_ID);

    expect(mockRegenerateFaviconFromLogoUrl).toHaveBeenCalledWith(BUSINESS_ID, '/api/assets/businesses/biz_1/assets/logo/current.png');
    expect(result?.faviconUrl).toBe('/api/assets/businesses/biz_1/assets/favicon.png');
    expect(result?.faviconSource).toBe('auto');
    expect(mockUpdateBusiness).toHaveBeenCalledWith(BUSINESS_ID, {
      faviconUrl: '/api/assets/businesses/biz_1/assets/favicon.png',
      faviconSource: 'auto',
    });
  });

  it('clears the favicon entirely when there is no logo to derive one from', async () => {
    mockGetBusinessById.mockResolvedValue(
      makeBusiness({ faviconUrl: '/api/assets/businesses/biz_1/assets/custom.png', faviconSource: 'manual' }),
    );

    const result = await resetCustomerFavicon(BUSINESS_ID);

    expect(mockRegenerateFaviconFromLogoUrl).not.toHaveBeenCalled();
    expect(result?.faviconUrl).toBeUndefined();
    expect(result?.faviconSource).toBe('auto');
  });
});
