/**
 * Unit tests for the Photo Manager actions — addBusinessPhotosAction,
 * deleteBusinessPhotoAction, updateBusinessLogoAction (business detail page
 * + onboarding wizard step 2's instant upload/delete controls, see
 * PhotoManager.tsx). All DynamoDB/S3 interactions and auth are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// actions.ts transitively imports lib/website-sections/persist.ts (Stage 19
// extraction), which imports the real 'server-only' package — must be
// mocked in every test environment (see lib/db/__tests__/site-previews.test.ts).
vi.mock('server-only', () => ({}));

const {
  mockGetBusinessById,
  mockPutBusiness,
  mockGetSession,
  mockUploadBusinessAsset,
  mockUploadBusinessAssetWithBuffer,
  mockAppendBusinessPhotos,
  mockAssetKeyFromUrl,
  mockDeleteAsset,
  mockListPreviewsForBusiness,
  mockPutSitePreview,
  mockRegenerateBusinessFavicon,
  mockRegenerateFaviconFromLogoUrl,
  mockValidateImageUpload,
} = vi.hoisted(() => ({
  mockGetBusinessById: vi.fn(),
  mockPutBusiness: vi.fn(),
  mockGetSession: vi.fn(),
  mockUploadBusinessAsset: vi.fn(),
  mockUploadBusinessAssetWithBuffer: vi.fn(),
  mockAppendBusinessPhotos: vi.fn(),
  mockAssetKeyFromUrl: vi.fn(),
  mockDeleteAsset: vi.fn(),
  mockListPreviewsForBusiness: vi.fn(),
  mockPutSitePreview: vi.fn(),
  mockRegenerateBusinessFavicon: vi.fn(),
  mockRegenerateFaviconFromLogoUrl: vi.fn(),
  mockValidateImageUpload: vi.fn(),
}));

const MockUploadValidationError = vi.hoisted(() => class extends Error {});

vi.mock('@/lib/db/businesses', () => ({
  getBusinessById: mockGetBusinessById,
  putBusiness: mockPutBusiness,
  updateBusiness: vi.fn(),
}));

vi.mock('@/lib/db/site-previews', () => ({
  listPreviewsForBusiness: mockListPreviewsForBusiness,
  getSitePreviewById: vi.fn(),
  putSitePreview: mockPutSitePreview,
}));

vi.mock('@/lib/db/scan-events', () => ({
  listScansForBusiness: vi.fn(),
  deleteScanEventById: vi.fn(),
}));

vi.mock('@/lib/db/postcards', () => ({
  listPostcardsForBusiness: vi.fn(),
  deletePostcardById: vi.fn(),
}));

vi.mock('@/lib/db/claims', () => ({
  listClaimsForBusiness: vi.fn(),
  deleteClaimById: vi.fn(),
  putClaim: vi.fn(),
  revokeClaim: vi.fn(),
}));

vi.mock('@/lib/claim/token', () => ({
  generateAndHashClaimToken: vi.fn(),
}));

vi.mock('@/lib/auth/customer-cognito', () => ({
  adminGetCustomerProfileBySub: vi.fn(),
}));


vi.mock('@/lib/auth/session', () => ({
  getSession: mockGetSession,
}));

vi.mock('@/lib/ai/generate-preview', () => ({
  generatePreviewContent: vi.fn(),
}));

vi.mock('@/lib/ai/generate-and-save-preview', () => ({
  generateAndSaveWebsite: vi.fn(),
}));

vi.mock('@/lib/theme/select-theme', () => ({
  resolveBusinessThemeForSeed: vi.fn(),
}));

vi.mock('@/lib/google-places/reviews', () => ({
  fetchAndMapGoogleReviews: vi.fn(),
}));

vi.mock('@/lib/s3/business-assets', () => ({
  uploadBusinessAsset: mockUploadBusinessAsset,
  uploadBusinessAssetWithBuffer: mockUploadBusinessAssetWithBuffer,
  appendBusinessPhotos: mockAppendBusinessPhotos,
  assetKeyFromUrl: mockAssetKeyFromUrl,
  fileExtension: vi.fn(() => 'jpg'),
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

vi.mock('@/lib/image/hero-dimensions', () => ({
  checkHeroPhotoDimensions: vi.fn(),
}));

vi.mock('@/lib/firecrawl/normalize', () => ({
  sanitizeAndDedupeSocialLinks: (values: string[], maxLen: number) =>
    values.filter((v, i) => values.indexOf(v) === i).slice(0, maxLen),
}));

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import {
  addBusinessPhotosAction,
  deleteBusinessPhotoAction,
  updateBusinessLogoAction,
  updateBusinessFaviconAction,
  resetBusinessFaviconAction,
} from '@/app/admin/(dashboard)/businesses/[businessId]/actions';
import type { Business } from '@/domain/models/business';
import type { SitePreview } from '@/domain/models/site-preview';

const EXISTING_BUSINESS: Business = {
  businessId: 'biz_00000000-0000-0000-0000-000000000001',
  slug: 'acme-plumbing',
  name: 'Acme Plumbing',
  industry: 'plumbing',
  source: 'manual',
  status: 'pending',
  servicesOffered: 'Drain cleaning',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function makeFile(name = 'photo.jpg'): File {
  return new File(['fake-bytes'], name, { type: 'image/jpeg' });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ sub: 'admin', expiresAt: new Date().toISOString() });
  mockGetBusinessById.mockResolvedValue(EXISTING_BUSINESS);
  mockPutBusiness.mockResolvedValue(undefined);
  mockListPreviewsForBusiness.mockResolvedValue([]);
  mockPutSitePreview.mockResolvedValue(undefined);
  mockDeleteAsset.mockResolvedValue(undefined);
  mockAssetKeyFromUrl.mockImplementation((url: string) =>
    url.startsWith('/api/assets/') ? url.slice('/api/assets/'.length) : null,
  );
  mockUploadBusinessAssetWithBuffer.mockResolvedValue({
    url: '/api/assets/businesses/biz_1/assets/logo.png',
    buffer: Buffer.from('fake-logo-bytes'),
  });
  mockRegenerateBusinessFavicon.mockResolvedValue('/api/assets/businesses/biz_1/assets/favicon.png');
  mockRegenerateFaviconFromLogoUrl.mockResolvedValue('/api/assets/businesses/biz_1/assets/favicon.png');
  mockValidateImageUpload.mockResolvedValue({ buffer: Buffer.from('fake-favicon-bytes'), contentType: 'image/png', extension: 'png' });
});

// ---------------------------------------------------------------------------
// addBusinessPhotosAction
// ---------------------------------------------------------------------------

describe('addBusinessPhotosAction', () => {
  it('requires an authenticated session', async () => {
    mockGetSession.mockResolvedValue(null);
    const fd = new FormData();
    fd.append('photos', makeFile());
    const result = await addBusinessPhotosAction(EXISTING_BUSINESS.businessId, undefined, fd);
    expect(result?.message).toBe('Unauthorized');
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('returns a message when no files are chosen', async () => {
    const result = await addBusinessPhotosAction(EXISTING_BUSINESS.businessId, undefined, new FormData());
    expect(result?.message).toMatch(/choose at least one photo/i);
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('appends new photos onto the existing array and returns the merged result', async () => {
    mockGetBusinessById.mockResolvedValue({
      ...EXISTING_BUSINESS,
      photoUrls: ['/api/assets/businesses/biz_1/assets/photos/existing.jpg'],
    });
    mockAppendBusinessPhotos.mockResolvedValue([
      '/api/assets/businesses/biz_1/assets/photos/existing.jpg',
      '/api/assets/businesses/biz_1/assets/photos/new-1.jpg',
      '/api/assets/businesses/biz_1/assets/photos/new-2.jpg',
    ]);

    const fd = new FormData();
    fd.append('photos', makeFile('a.jpg'));
    fd.append('photos', makeFile('b.jpg'));

    const result = await addBusinessPhotosAction(EXISTING_BUSINESS.businessId, undefined, fd);

    expect(mockAppendBusinessPhotos).toHaveBeenCalledWith(
      EXISTING_BUSINESS.businessId,
      ['/api/assets/businesses/biz_1/assets/photos/existing.jpg'],
      expect.arrayContaining([expect.any(File), expect.any(File)]),
    );
    expect(result?.photoUrls).toEqual([
      '/api/assets/businesses/biz_1/assets/photos/existing.jpg',
      '/api/assets/businesses/biz_1/assets/photos/new-1.jpg',
      '/api/assets/businesses/biz_1/assets/photos/new-2.jpg',
    ]);
    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.photoUrls).toEqual(result?.photoUrls);
  });

  it('rejects the whole batch (no partial upload) when it would exceed the 6-photo cap', async () => {
    mockGetBusinessById.mockResolvedValue({
      ...EXISTING_BUSINESS,
      photoUrls: Array.from({ length: 5 }, (_, i) => `/api/assets/businesses/biz_1/assets/photos/${i}.jpg`),
    });

    const fd = new FormData();
    fd.append('photos', makeFile('a.jpg'));
    fd.append('photos', makeFile('b.jpg'));

    const result = await addBusinessPhotosAction(EXISTING_BUSINESS.businessId, undefined, fd);

    expect(result?.message).toMatch(/maximum 6 photos/i);
    expect(mockAppendBusinessPhotos).not.toHaveBeenCalled();
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteBusinessPhotoAction
// ---------------------------------------------------------------------------

describe('deleteBusinessPhotoAction', () => {
  function fd(photoUrl: string): FormData {
    const f = new FormData();
    f.set('photoUrl', photoUrl);
    return f;
  }

  it('requires an authenticated session', async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await deleteBusinessPhotoAction(EXISTING_BUSINESS.businessId, undefined, fd('x'));
    expect(result?.message).toBe('Unauthorized');
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('removes the photo from photoUrls and deletes its S3 object', async () => {
    const target = '/api/assets/businesses/biz_1/assets/photos/target.jpg';
    const keep = '/api/assets/businesses/biz_1/assets/photos/keep.jpg';
    mockGetBusinessById.mockResolvedValue({ ...EXISTING_BUSINESS, photoUrls: [keep, target] });

    const result = await deleteBusinessPhotoAction(EXISTING_BUSINESS.businessId, undefined, fd(target));

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.photoUrls).toEqual([keep]);
    expect(result?.photoUrls).toEqual([keep]);
    expect(mockDeleteAsset).toHaveBeenCalledWith('businesses/biz_1/assets/photos/target.jpg');
  });

  it('clears only the slot(s)/logo that were pinned to the deleted photo, leaving others untouched', async () => {
    const target = '/api/assets/businesses/biz_1/assets/photos/target.jpg';
    const other = '/api/assets/businesses/biz_1/assets/photos/other.jpg';
    mockGetBusinessById.mockResolvedValue({
      ...EXISTING_BUSINESS,
      photoUrls: [target, other],
      heroPhotoUrl: target,
      aboutPhotoUrl: other,
      logoUrl: target,
    });

    await deleteBusinessPhotoAction(EXISTING_BUSINESS.businessId, undefined, fd(target));

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.heroPhotoUrl).toBeUndefined();
    expect(saved.logoUrl).toBeUndefined();
    expect(saved.aboutPhotoUrl).toBe(other);
  });

  it('also clears an auto-derived favicon when the deleted photo was pinned as the logo', async () => {
    const target = '/api/assets/businesses/biz_1/assets/photos/target.jpg';
    mockGetBusinessById.mockResolvedValue({
      ...EXISTING_BUSINESS,
      photoUrls: [target],
      logoUrl: target,
      faviconUrl: '/api/assets/businesses/biz_1/assets/favicon.png',
      faviconSource: 'auto',
    });

    const result = await deleteBusinessPhotoAction(EXISTING_BUSINESS.businessId, undefined, fd(target));

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.faviconUrl).toBeUndefined();
    expect(result?.faviconUrl).toBeUndefined();
  });

  it('never clears a manually-set favicon, even when the deleted photo was pinned as the logo', async () => {
    const target = '/api/assets/businesses/biz_1/assets/photos/target.jpg';
    mockGetBusinessById.mockResolvedValue({
      ...EXISTING_BUSINESS,
      photoUrls: [target],
      logoUrl: target,
      faviconUrl: '/api/assets/businesses/biz_1/assets/custom.png',
      faviconSource: 'manual',
    });

    const result = await deleteBusinessPhotoAction(EXISTING_BUSINESS.businessId, undefined, fd(target));

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.faviconUrl).toBe('/api/assets/businesses/biz_1/assets/custom.png');
    expect(result?.faviconUrl).toBe('/api/assets/businesses/biz_1/assets/custom.png');
  });

  it('dual-writes the latest SitePreview.theme only when a slot was actually cleared', async () => {
    const target = '/api/assets/businesses/biz_1/assets/photos/target.jpg';
    mockGetBusinessById.mockResolvedValue({
      ...EXISTING_BUSINESS,
      photoUrls: [target],
      heroPhotoUrl: target,
    });
    const latestPreview = {
      previewId: 'preview_1',
      businessId: EXISTING_BUSINESS.businessId,
      theme: { themeName: 'classicBlue', fontFamily: 'system-ui', heroImageUrl: target, heroStyle: 'image' },
    } as unknown as SitePreview;
    mockListPreviewsForBusiness.mockResolvedValue([latestPreview]);

    await deleteBusinessPhotoAction(EXISTING_BUSINESS.businessId, undefined, fd(target));

    expect(mockPutSitePreview).toHaveBeenCalledTimes(1);
    const savedPreview = mockPutSitePreview.mock.calls[0][0];
    expect(savedPreview.theme.heroImageUrl).toBeUndefined();
    expect(savedPreview.theme.heroStyle).toBe('illustration');
  });

  it('does not dual-write when the deleted photo was not pinned to any slot', async () => {
    const target = '/api/assets/businesses/biz_1/assets/photos/target.jpg';
    mockGetBusinessById.mockResolvedValue({ ...EXISTING_BUSINESS, photoUrls: [target] });
    mockListPreviewsForBusiness.mockResolvedValue([{ previewId: 'preview_1' } as unknown as SitePreview]);

    await deleteBusinessPhotoAction(EXISTING_BUSINESS.businessId, undefined, fd(target));

    expect(mockPutSitePreview).not.toHaveBeenCalled();
  });

  it('is idempotent when the photo is already gone', async () => {
    mockGetBusinessById.mockResolvedValue({ ...EXISTING_BUSINESS, photoUrls: [] });

    const result = await deleteBusinessPhotoAction(
      EXISTING_BUSINESS.businessId,
      undefined,
      fd('/api/assets/businesses/biz_1/assets/photos/gone.jpg'),
    );

    expect(mockPutBusiness).not.toHaveBeenCalled();
    expect(mockDeleteAsset).not.toHaveBeenCalled();
    expect(result?.photoUrls).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// updateBusinessLogoAction
// ---------------------------------------------------------------------------

describe('updateBusinessLogoAction', () => {
  it('requires an authenticated session', async () => {
    mockGetSession.mockResolvedValue(null);
    const fd = new FormData();
    fd.set('logo', makeFile('logo.png'));
    const result = await updateBusinessLogoAction(EXISTING_BUSINESS.businessId, undefined, fd);
    expect(result?.message).toBe('Unauthorized');
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('returns a message when no file is chosen', async () => {
    const result = await updateBusinessLogoAction(EXISTING_BUSINESS.businessId, undefined, new FormData());
    expect(result?.message).toMatch(/choose a logo file/i);
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('uploads the file and sets Business.logoUrl', async () => {
    const fd = new FormData();
    fd.set('logo', makeFile('logo.png'));

    const result = await updateBusinessLogoAction(EXISTING_BUSINESS.businessId, undefined, fd);

    expect(mockUploadBusinessAssetWithBuffer).toHaveBeenCalledWith(EXISTING_BUSINESS.businessId, expect.any(File), 'logo');
    expect(result?.logoUrl).toBe('/api/assets/businesses/biz_1/assets/logo.png');
    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.logoUrl).toBe('/api/assets/businesses/biz_1/assets/logo.png');
  });

  it('regenerates the favicon from the new logo when faviconSource is unset (auto)', async () => {
    const fd = new FormData();
    fd.set('logo', makeFile('logo.png'));

    const result = await updateBusinessLogoAction(EXISTING_BUSINESS.businessId, undefined, fd);

    expect(mockRegenerateBusinessFavicon).toHaveBeenCalledWith(EXISTING_BUSINESS.businessId, Buffer.from('fake-logo-bytes'));
    expect(result?.faviconUrl).toBe('/api/assets/businesses/biz_1/assets/favicon.png');
    expect(result?.faviconSource).toBe('auto');
    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.faviconUrl).toBe('/api/assets/businesses/biz_1/assets/favicon.png');
    expect(saved.faviconSource).toBe('auto');
  });

  it('does not regenerate the favicon when faviconSource is already manual', async () => {
    mockGetBusinessById.mockResolvedValue({
      ...EXISTING_BUSINESS,
      faviconUrl: '/api/assets/businesses/biz_1/assets/favicon.png',
      faviconSource: 'manual',
    });
    const fd = new FormData();
    fd.set('logo', makeFile('logo.png'));

    const result = await updateBusinessLogoAction(EXISTING_BUSINESS.businessId, undefined, fd);

    expect(mockRegenerateBusinessFavicon).not.toHaveBeenCalled();
    expect(result?.faviconUrl).toBe('/api/assets/businesses/biz_1/assets/favicon.png');
    expect(result?.faviconSource).toBe('manual');
  });
});

// ---------------------------------------------------------------------------
// updateBusinessFaviconAction
// ---------------------------------------------------------------------------

describe('updateBusinessFaviconAction', () => {
  it('requires an authenticated session', async () => {
    mockGetSession.mockResolvedValue(null);
    const fd = new FormData();
    fd.set('favicon', makeFile('icon.png'));
    const result = await updateBusinessFaviconAction(EXISTING_BUSINESS.businessId, undefined, fd);
    expect(result?.message).toBe('Unauthorized');
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('returns a message when no file is chosen', async () => {
    const result = await updateBusinessFaviconAction(EXISTING_BUSINESS.businessId, undefined, new FormData());
    expect(result?.message).toMatch(/choose an image/i);
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('uploads, regenerates, and marks the favicon manual', async () => {
    const fd = new FormData();
    fd.set('favicon', makeFile('icon.png'));

    const result = await updateBusinessFaviconAction(EXISTING_BUSINESS.businessId, undefined, fd);

    expect(mockValidateImageUpload).toHaveBeenCalledWith(expect.any(File));
    expect(mockRegenerateBusinessFavicon).toHaveBeenCalledWith(EXISTING_BUSINESS.businessId, Buffer.from('fake-favicon-bytes'));
    expect(result?.faviconUrl).toBe('/api/assets/businesses/biz_1/assets/favicon.png');
    expect(result?.faviconSource).toBe('manual');
    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.faviconSource).toBe('manual');
  });

  it('surfaces an UploadValidationError message without persisting', async () => {
    mockValidateImageUpload.mockRejectedValue(new MockUploadValidationError('Unsupported file type.'));
    const fd = new FormData();
    fd.set('favicon', makeFile('icon.png'));

    const result = await updateBusinessFaviconAction(EXISTING_BUSINESS.businessId, undefined, fd);

    expect(result?.message).toBe('Unsupported file type.');
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// resetBusinessFaviconAction
// ---------------------------------------------------------------------------

describe('resetBusinessFaviconAction', () => {
  it('requires an authenticated session', async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await resetBusinessFaviconAction(EXISTING_BUSINESS.businessId, undefined, new FormData());
    expect(result?.message).toBe('Unauthorized');
  });

  it('regenerates immediately from the current logo and marks the favicon auto', async () => {
    mockGetBusinessById.mockResolvedValue({
      ...EXISTING_BUSINESS,
      logoUrl: '/api/assets/businesses/biz_1/assets/logo.png',
      faviconUrl: '/api/assets/businesses/biz_1/assets/custom.png',
      faviconSource: 'manual',
    });

    const result = await resetBusinessFaviconAction(EXISTING_BUSINESS.businessId, undefined, new FormData());

    expect(mockRegenerateFaviconFromLogoUrl).toHaveBeenCalledWith(
      EXISTING_BUSINESS.businessId,
      '/api/assets/businesses/biz_1/assets/logo.png',
    );
    expect(result?.faviconUrl).toBe('/api/assets/businesses/biz_1/assets/favicon.png');
    expect(result?.faviconSource).toBe('auto');
    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.faviconSource).toBe('auto');
  });

  it('clears the favicon entirely when there is no logo to derive one from', async () => {
    mockGetBusinessById.mockResolvedValue({
      ...EXISTING_BUSINESS,
      logoUrl: undefined,
      faviconUrl: '/api/assets/businesses/biz_1/assets/custom.png',
      faviconSource: 'manual',
    });

    const result = await resetBusinessFaviconAction(EXISTING_BUSINESS.businessId, undefined, new FormData());

    expect(mockRegenerateFaviconFromLogoUrl).not.toHaveBeenCalled();
    expect(result?.faviconUrl).toBeUndefined();
    expect(result?.faviconSource).toBe('auto');
  });
});
