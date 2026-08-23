/**
 * Unit tests for updateBusinessDetailsAction and updatePhotosAction — the
 * business detail page's inline "Business Details" and "Photos" cards
 * (also reused, unmodified, as wizard steps 1's follow-on "Photos" step).
 * All DynamoDB/S3 interactions and auth are mocked.
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
  mockListPreviewsForBusiness,
  mockPutSitePreview,
} = vi.hoisted(() => ({
  mockGetBusinessById: vi.fn(),
  mockPutBusiness: vi.fn(),
  mockGetSession: vi.fn(),
  mockListPreviewsForBusiness: vi.fn(),
  mockPutSitePreview: vi.fn(),
}));

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
  uploadBusinessAsset: vi.fn(),
  appendBusinessPhotos: vi.fn(),
  assetKeyFromUrl: vi.fn(),
  fileExtension: vi.fn(),
}));

vi.mock('@/lib/s3/assets', () => ({
  deleteAsset: vi.fn(),
}));

vi.mock('@/lib/image/hero-dimensions', () => ({
  checkHeroPhotoDimensions: vi.fn().mockResolvedValue({ isFullBleedEligible: true, width: 1920, height: 1080 }),
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
  updateBusinessDetailsAction,
  updatePhotosAction,
} from '@/app/admin/(dashboard)/businesses/[businessId]/actions';
import type { Business } from '@/domain/models/business';
import type { SitePreview } from '@/domain/models/site-preview';

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, v);
  }
  return fd;
}

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

const REDIRECT_TO = `/admin/businesses/${EXISTING_BUSINESS.businessId}`;

const EXISTING_PREVIEW: SitePreview = {
  previewId: 'preview_00000000-0000-0000-0000-000000000001',
  businessId: EXISTING_BUSINESS.businessId,
  slug: EXISTING_BUSINESS.slug,
  version: 1,
  status: 'published',
  templateId: 'local-business-v1',
  content: {
    hero: { headline: 'Acme Plumbing', subheadline: 'Reliable service.', ctaText: 'Get a Free Quote' },
    services: [{ name: 'Drain Cleaning', description: 'Fast drain service.' }],
    tagline: 'Trusted local plumbing.',
    aboutText: 'We are Acme Plumbing.',
    contact: { phone: '512-555-0100' },
  },
  theme: { primaryColor: '#0F356B', accentColor: '#ED7023', fontFamily: 'sans-serif' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ sub: 'admin', expiresAt: new Date().toISOString() });
  mockGetBusinessById.mockResolvedValue(EXISTING_BUSINESS);
  mockPutBusiness.mockResolvedValue(undefined);
  mockListPreviewsForBusiness.mockResolvedValue([]);
  mockPutSitePreview.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// updateBusinessDetailsAction
// ---------------------------------------------------------------------------

describe('updateBusinessDetailsAction', () => {
  const DETAILS_FIELDS = {
    name: 'Acme HVAC',
    industry: 'hvac',
  };

  it('requires an authenticated session', async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await updateBusinessDetailsAction(
      EXISTING_BUSINESS.businessId,
      REDIRECT_TO,
      undefined,
      makeFormData(DETAILS_FIELDS),
    );
    expect(result?.message).toBe('Unauthorized');
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('returns an error when the business does not exist', async () => {
    mockGetBusinessById.mockResolvedValue(null);
    const result = await updateBusinessDetailsAction(
      'biz_notfound',
      REDIRECT_TO,
      undefined,
      makeFormData(DETAILS_FIELDS),
    );
    expect(result?.message).toBe('Business not found');
  });

  it('saves updated identity/contact fields and redirects to the given URL', async () => {
    await expect(
      updateBusinessDetailsAction(EXISTING_BUSINESS.businessId, REDIRECT_TO, undefined, makeFormData(DETAILS_FIELDS)),
    ).rejects.toThrow(`REDIRECT:${REDIRECT_TO}`);

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.name).toBe('Acme HVAC');
    expect(saved.industry).toBe('hvac');
    expect(saved.status).toBe(EXISTING_BUSINESS.status);
    expect(saved.businessId).toBe(EXISTING_BUSINESS.businessId);
  });

  it('never touches theme/source/status fields', async () => {
    mockGetBusinessById.mockResolvedValue({ ...EXISTING_BUSINESS, theme: 'classicBlue', source: 'import', status: 'engaged' });

    await expect(
      updateBusinessDetailsAction(EXISTING_BUSINESS.businessId, REDIRECT_TO, undefined, makeFormData(DETAILS_FIELDS)),
    ).rejects.toThrow('REDIRECT:');

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.theme).toBe('classicBlue');
    expect(saved.source).toBe('import');
    expect(saved.status).toBe('engaged');
  });

  it('never touches photo fields (logoUrl, photoUrls, photo-slot overrides)', async () => {
    mockGetBusinessById.mockResolvedValue({
      ...EXISTING_BUSINESS,
      logoUrl: '/api/assets/businesses/biz_1/assets/logo.png',
      photoUrls: ['/api/assets/businesses/biz_1/assets/photos/0.jpg'],
      heroPhotoUrl: '/api/assets/businesses/biz_1/assets/photos/0.jpg',
    });

    await expect(
      updateBusinessDetailsAction(EXISTING_BUSINESS.businessId, REDIRECT_TO, undefined, makeFormData(DETAILS_FIELDS)),
    ).rejects.toThrow('REDIRECT:');

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.logoUrl).toBe('/api/assets/businesses/biz_1/assets/logo.png');
    expect(saved.photoUrls).toEqual(['/api/assets/businesses/biz_1/assets/photos/0.jpg']);
    expect(saved.heroPhotoUrl).toBe('/api/assets/businesses/biz_1/assets/photos/0.jpg');
  });

  it('persists a legal name and website-generation fields', async () => {
    await expect(
      updateBusinessDetailsAction(
        EXISTING_BUSINESS.businessId,
        REDIRECT_TO,
        undefined,
        makeFormData({ ...DETAILS_FIELDS, legalName: 'Acme HVAC LLC', servicesOffered: 'AC repair' }),
      ),
    ).rejects.toThrow('REDIRECT:');

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.legalName).toBe('Acme HVAC LLC');
    expect(saved.servicesOffered).toBe('AC repair');
  });

  it('rejects an invalid email without persisting', async () => {
    const result = await updateBusinessDetailsAction(
      EXISTING_BUSINESS.businessId,
      REDIRECT_TO,
      undefined,
      makeFormData({ ...DETAILS_FIELDS, email: 'not-an-email' }),
    );
    expect(result?.errors?.email).toBeDefined();
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('dual-writes a newly-entered email onto the latest preview\'s content.contact, without touching the preview otherwise', async () => {
    mockListPreviewsForBusiness.mockResolvedValue([EXISTING_PREVIEW]);

    await expect(
      updateBusinessDetailsAction(
        EXISTING_BUSINESS.businessId,
        REDIRECT_TO,
        undefined,
        makeFormData({ ...DETAILS_FIELDS, email: 'hello@acme.com' }),
      ),
    ).rejects.toThrow('REDIRECT:');

    expect(mockPutSitePreview).toHaveBeenCalledTimes(1);
    const savedPreview = mockPutSitePreview.mock.calls[0][0];
    expect(savedPreview.content.contact).toEqual({ phone: '512-555-0100', email: 'hello@acme.com' });
    expect(savedPreview.content.hero).toEqual(EXISTING_PREVIEW.content.hero);
  });

  it('dual-writes phone/email/address together, formatting address the same way generation does', async () => {
    mockListPreviewsForBusiness.mockResolvedValue([EXISTING_PREVIEW]);

    await expect(
      updateBusinessDetailsAction(
        EXISTING_BUSINESS.businessId,
        REDIRECT_TO,
        undefined,
        makeFormData({
          ...DETAILS_FIELDS,
          phone: '512-555-9999',
          email: 'hello@acme.com',
          addressLine1: '123 Main St',
          addressCity: 'Austin',
          addressState: 'TX',
          addressPostalCode: '78701',
        }),
      ),
    ).rejects.toThrow('REDIRECT:');

    const savedPreview = mockPutSitePreview.mock.calls[0][0];
    expect(savedPreview.content.contact).toEqual({
      phone: '512-555-9999',
      email: 'hello@acme.com',
      address: '123 Main St, Austin, TX, 78701',
    });
  });

  it('leaves the preview untouched when no contact field or social link was submitted', async () => {
    mockListPreviewsForBusiness.mockResolvedValue([EXISTING_PREVIEW]);

    await expect(
      updateBusinessDetailsAction(EXISTING_BUSINESS.businessId, REDIRECT_TO, undefined, makeFormData(DETAILS_FIELDS)),
    ).rejects.toThrow('REDIRECT:');

    expect(mockPutSitePreview).not.toHaveBeenCalled();
  });

  it('never wipes an existing preview contact field when the corresponding form field is left blank', async () => {
    mockListPreviewsForBusiness.mockResolvedValue([
      { ...EXISTING_PREVIEW, content: { ...EXISTING_PREVIEW.content, contact: { phone: '512-555-0100', email: 'old@acme.com' } } },
    ]);

    await expect(
      updateBusinessDetailsAction(
        EXISTING_BUSINESS.businessId,
        REDIRECT_TO,
        undefined,
        makeFormData({ ...DETAILS_FIELDS, phone: '512-555-0100' }),
      ),
    ).rejects.toThrow('REDIRECT:');

    const savedPreview = mockPutSitePreview.mock.calls[0][0];
    expect(savedPreview.content.contact.email).toBe('old@acme.com');
  });
});

// ---------------------------------------------------------------------------
// updatePhotosAction
// ---------------------------------------------------------------------------

describe('updatePhotosAction', () => {
  it('requires an authenticated session', async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await updatePhotosAction(EXISTING_BUSINESS.businessId, REDIRECT_TO, undefined, new FormData());
    expect(result?.message).toBe('Unauthorized');
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('returns an error when the business does not exist', async () => {
    mockGetBusinessById.mockResolvedValue(null);
    const result = await updatePhotosAction('biz_notfound', REDIRECT_TO, undefined, new FormData());
    expect(result?.message).toBe('Business not found');
  });

  it('preserves existing photoUrls (bulk logo/photo uploads no longer happen through this action — see photos-actions.test.ts)', async () => {
    mockGetBusinessById.mockResolvedValue({
      ...EXISTING_BUSINESS,
      photoUrls: ['/api/assets/businesses/biz_1/assets/photos/0.jpg'],
    });

    await expect(
      updatePhotosAction(EXISTING_BUSINESS.businessId, REDIRECT_TO, undefined, new FormData()),
    ).rejects.toThrow('REDIRECT:');

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.photoUrls).toEqual(['/api/assets/businesses/biz_1/assets/photos/0.jpg']);
  });

  it('persists photo-slot overrides', async () => {
    const fd = makeFormData({
      heroPhotoUrl: '/api/assets/businesses/biz_1/assets/photos/0.jpg',
      servicesPhotoUrl: 'none',
    });

    await expect(
      updatePhotosAction(EXISTING_BUSINESS.businessId, REDIRECT_TO, undefined, fd),
    ).rejects.toThrow('REDIRECT:');

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.heroPhotoUrl).toBe('/api/assets/businesses/biz_1/assets/photos/0.jpg');
    expect(saved.servicesPhotoUrl).toBe('none');
  });

  it('never touches business-details fields (name, industry, status)', async () => {
    await expect(
      updatePhotosAction(EXISTING_BUSINESS.businessId, REDIRECT_TO, undefined, new FormData()),
    ).rejects.toThrow('REDIRECT:');

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.name).toBe(EXISTING_BUSINESS.name);
    expect(saved.industry).toBe(EXISTING_BUSINESS.industry);
    expect(saved.status).toBe(EXISTING_BUSINESS.status);
    expect(saved.servicesOffered).toBe(EXISTING_BUSINESS.servicesOffered);
  });

  it('leaving the logo picker on "Auto" (unset) keeps the existing logoUrl unchanged', async () => {
    mockGetBusinessById.mockResolvedValue({ ...EXISTING_BUSINESS, logoUrl: '/api/assets/businesses/biz_1/assets/logo.png' });

    await expect(
      updatePhotosAction(EXISTING_BUSINESS.businessId, REDIRECT_TO, undefined, new FormData()),
    ).rejects.toThrow('REDIRECT:');

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.logoUrl).toBe('/api/assets/businesses/biz_1/assets/logo.png');
  });

  it('picking a photo in the logo picker sets Business.logoUrl to it — e.g. a promoted scan image', async () => {
    const fd = makeFormData({ logoPhotoUrl: '/api/assets/businesses/biz_1/assets/photos/2.jpg' });

    await expect(
      updatePhotosAction(EXISTING_BUSINESS.businessId, REDIRECT_TO, undefined, fd),
    ).rejects.toThrow('REDIRECT:');

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.logoUrl).toBe('/api/assets/businesses/biz_1/assets/photos/2.jpg');
  });

  it('picking "No photo" in the logo picker clears logoUrl', async () => {
    mockGetBusinessById.mockResolvedValue({ ...EXISTING_BUSINESS, logoUrl: '/api/assets/businesses/biz_1/assets/logo.png' });
    const fd = makeFormData({ logoPhotoUrl: 'none' });

    await expect(
      updatePhotosAction(EXISTING_BUSINESS.businessId, REDIRECT_TO, undefined, fd),
    ).rejects.toThrow('REDIRECT:');

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.logoUrl).toBeUndefined();
  });

});
