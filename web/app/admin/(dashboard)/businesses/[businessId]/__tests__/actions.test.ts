/**
 * Unit tests for updatePreviewCtaAction (the preview CTA editor's server action).
 * All DynamoDB interactions and auth are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// actions.ts transitively imports lib/website-sections/persist.ts (Stage 19
// extraction), which imports the real 'server-only' package — must be
// mocked in every test environment, same as every other file that imports
// it (see lib/db/__tests__/site-previews.test.ts for the same pattern).
vi.mock('server-only', () => ({}));

// ---------------------------------------------------------------------------
// Hoisted mock functions
// ---------------------------------------------------------------------------

const {
  mockGetSitePreviewById,
  mockPutSitePreview,
  mockListPreviewsForBusiness,
  mockDeletePreviewById,
  mockPublishSitePreview,
  mockListScansForBusiness,
  mockDeleteScanEventById,
  mockListPostcardsForBusiness,
  mockDeletePostcardById,
  mockGetBusinessById,
  mockDeleteBusinessById,
  mockUpdateBusiness,
  mockPutBusiness,
  mockGetSession,
  mockGenerateAndSaveWebsite,
} = vi.hoisted(() => ({
  mockGetSitePreviewById: vi.fn(),
  mockPutSitePreview: vi.fn(),
  mockListPreviewsForBusiness: vi.fn(),
  mockDeletePreviewById: vi.fn(),
  mockPublishSitePreview: vi.fn(),
  mockListScansForBusiness: vi.fn(),
  mockDeleteScanEventById: vi.fn(),
  mockListPostcardsForBusiness: vi.fn(),
  mockDeletePostcardById: vi.fn(),
  mockGetBusinessById: vi.fn(),
  mockDeleteBusinessById: vi.fn(),
  mockUpdateBusiness: vi.fn(),
  mockPutBusiness: vi.fn(),
  mockGetSession: vi.fn(),
  mockGenerateAndSaveWebsite: vi.fn(),
}));

// The detailed generation pipeline (cap check, theme/CTA seeding, version
// increment) is tested directly against `generateAndSaveWebsite` in
// `lib/ai/__tests__/generate-and-save-preview.test.ts` — this file only
// tests that `generateWebsiteAction` delegates to it and maps the outcome.
vi.mock('@/lib/ai/generate-and-save-preview', () => ({
  generateAndSaveWebsite: mockGenerateAndSaveWebsite,
}));

vi.mock('@/lib/theme/select-theme', () => ({
  resolveBusinessThemeForSeed: vi.fn(),
}));

vi.mock('@/lib/google-places/reviews', () => ({
  fetchAndMapGoogleReviews: vi.fn(),
}));

vi.mock('@/lib/db/site-previews', () => ({
  getSitePreviewById: mockGetSitePreviewById,
  putSitePreview: mockPutSitePreview,
  listPreviewsForBusiness: mockListPreviewsForBusiness,
  deletePreviewById: mockDeletePreviewById,
  publishSitePreview: mockPublishSitePreview,
}));

vi.mock('@/lib/db/scan-events', () => ({
  listScansForBusiness: mockListScansForBusiness,
  deleteScanEventById: mockDeleteScanEventById,
}));

vi.mock('@/lib/db/postcards', () => ({
  listPostcardsForBusiness: mockListPostcardsForBusiness,
  deletePostcardById: mockDeletePostcardById,
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


vi.mock('@/lib/db/businesses', () => ({
  getBusinessById: mockGetBusinessById,
  deleteBusinessById: mockDeleteBusinessById,
  updateBusiness: mockUpdateBusiness,
  putBusiness: mockPutBusiness,
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: mockGetSession,
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

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { updatePreviewCtaAction, generateWebsiteAction, publishPreviewAction, updateAdminFieldsAction } from '@/app/admin/(dashboard)/businesses/[businessId]/actions';
import type { SitePreview } from '@/domain/models/site-preview';
import type { Business } from '@/domain/models/business';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, v);
  }
  return fd;
}

const EXISTING_PREVIEW: SitePreview = {
  previewId: 'preview_00000000-0000-0000-0000-000000000001',
  businessId: 'biz_00000000-0000-0000-0000-000000000001',
  slug: 'acme-plumbing',
  version: 1,
  status: 'published',
  templateId: 'local-business-v1',
  content: {
    hero: { headline: 'Acme Plumbing', subheadline: 'Reliable service.', ctaText: 'Get a Free Quote' },
    services: [{ name: 'Drain Cleaning', description: 'Fast drain service.' }],
    tagline: 'Trusted local plumbing.',
    aboutText: 'We are Acme Plumbing.',
    contact: { phone: '512-555-0100', email: 'hello@acme.com' },
  },
  theme: { primaryColor: '#0F356B', accentColor: '#ED7023', fontFamily: 'sans-serif' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const EXISTING_BUSINESS: Business = {
  businessId: 'biz_00000000-0000-0000-0000-000000000001',
  slug: 'acme-plumbing',
  name: 'Acme Plumbing',
  industry: 'plumbing',
  source: 'manual',
  status: 'pending',
  servicesOffered: 'Drain cleaning\nWater heater repair',
  phone: '512-555-0100',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ sub: 'admin', expiresAt: new Date().toISOString() });
  mockGetSitePreviewById.mockResolvedValue(EXISTING_PREVIEW);
  mockPutSitePreview.mockResolvedValue(undefined);
  mockGetBusinessById.mockResolvedValue(EXISTING_BUSINESS);
  mockListPreviewsForBusiness.mockResolvedValue([]);
  mockGenerateAndSaveWebsite.mockResolvedValue({ status: 'completed', previewId: EXISTING_PREVIEW.previewId });
  mockUpdateBusiness.mockResolvedValue(EXISTING_BUSINESS);
  mockPutBusiness.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// generateWebsiteAction — the detailed generation pipeline (cap check,
// theme/CTA seeding, version increment) is tested directly against
// `generateAndSaveWebsite` in `lib/ai/__tests__/generate-and-save-preview.test.ts`.
// These tests cover only this thin Server Action wrapper.
// ---------------------------------------------------------------------------

describe('generateWebsiteAction', () => {
  it('delegates to generateAndSaveWebsite and redirects on success', async () => {
    await expect(
      generateWebsiteAction(EXISTING_BUSINESS.businessId, undefined, new FormData()),
    ).rejects.toThrow(`REDIRECT:/admin/businesses/${EXISTING_BUSINESS.businessId}`);

    expect(mockGenerateAndSaveWebsite).toHaveBeenCalledWith(EXISTING_BUSINESS.businessId);
  });

  it('returns the outcome message without redirecting when generation is not eligible', async () => {
    mockGenerateAndSaveWebsite.mockResolvedValueOnce({
      status: 'not_eligible',
      message: 'Add at least one service under "Services offered" before generating a website.',
    });

    const result = await generateWebsiteAction(EXISTING_BUSINESS.businessId, undefined, new FormData());

    expect(result?.message).toMatch(/at least one service/i);
  });

  it('returns a safe generic message without redirecting when generation fails', async () => {
    mockGenerateAndSaveWebsite.mockResolvedValueOnce({
      status: 'failed',
      message: 'Failed to generate website. Please try again.',
    });

    const result = await generateWebsiteAction(EXISTING_BUSINESS.businessId, undefined, new FormData());

    expect(result?.message).toBe('Failed to generate website. Please try again.');
  });

  it('returns Unauthorized when session is missing, without calling generateAndSaveWebsite', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const result = await generateWebsiteAction(EXISTING_BUSINESS.businessId, undefined, new FormData());
    expect(result?.message).toBe('Unauthorized');
    expect(mockGenerateAndSaveWebsite).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// publishPreviewAction
// ---------------------------------------------------------------------------

describe('publishPreviewAction', () => {
  it('publishes the preview, updates Business.currentPreviewId, and redirects', async () => {
    const published = { ...EXISTING_PREVIEW, status: 'published' as const };
    mockPublishSitePreview.mockResolvedValueOnce(published);

    await expect(
      publishPreviewAction(EXISTING_BUSINESS.businessId, EXISTING_PREVIEW.previewId, undefined, new FormData()),
    ).rejects.toThrow(`REDIRECT:/admin/businesses/${EXISTING_BUSINESS.businessId}`);

    expect(mockPublishSitePreview).toHaveBeenCalledWith(EXISTING_PREVIEW.previewId);
    expect(mockUpdateBusiness).toHaveBeenCalledWith(EXISTING_BUSINESS.businessId, {
      currentPreviewId: published.previewId,
    });
  });

  it('returns an error without redirecting when the preview is not found', async () => {
    mockPublishSitePreview.mockResolvedValueOnce(null);

    const result = await publishPreviewAction(
      EXISTING_BUSINESS.businessId,
      'preview_missing',
      undefined,
      new FormData(),
    );

    expect(result?.error).toBe('Preview not found.');
    expect(mockUpdateBusiness).not.toHaveBeenCalled();
  });

  it('returns Unauthorized when session is missing, without calling publishSitePreview', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const result = await publishPreviewAction(
      EXISTING_BUSINESS.businessId,
      EXISTING_PREVIEW.previewId,
      undefined,
      new FormData(),
    );
    expect(result?.error).toBe('Unauthorized');
    expect(mockPublishSitePreview).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updatePreviewCtaAction — validation
// ---------------------------------------------------------------------------

describe('updatePreviewCtaAction — validation', () => {
  it('requires a label unless the type is "none"', async () => {
    const fd = makeFormData({ primaryType: 'phone', primaryLabel: '' });
    const result = await updatePreviewCtaAction(EXISTING_PREVIEW.previewId, undefined, fd);
    expect(result?.errors?.primaryLabel).toBeDefined();
    expect(mockPutSitePreview).not.toHaveBeenCalled();
  });

  it('requires a valid https URL for external_url CTAs', async () => {
    const fd = makeFormData({
      primaryType: 'external_url',
      primaryLabel: 'Book Online',
      primaryValue: 'http://not-https.example.com',
    });
    const result = await updatePreviewCtaAction(EXISTING_PREVIEW.previewId, undefined, fd);
    expect(result?.errors?.primaryValue).toBeDefined();
    expect(mockPutSitePreview).not.toHaveBeenCalled();
  });

  it('rejects an unsafe protocol for external_url CTAs', async () => {
    const fd = makeFormData({
      primaryType: 'external_url',
      primaryLabel: 'Book Online',
      primaryValue: 'javascript:alert(1)',
    });
    const result = await updatePreviewCtaAction(EXISTING_PREVIEW.previewId, undefined, fd);
    expect(result?.errors?.primaryValue).toBeDefined();
    expect(mockPutSitePreview).not.toHaveBeenCalled();
  });

  it('does not require a label when the primary type is "none"', async () => {
    const fd = makeFormData({ primaryType: 'none', primaryLabel: '' });
    await expect(
      updatePreviewCtaAction(EXISTING_PREVIEW.previewId, undefined, fd),
    ).rejects.toThrow('REDIRECT:');
    expect(mockPutSitePreview).toHaveBeenCalledOnce();
  });

  it('validates the secondary CTA only when enabled', async () => {
    const fd = makeFormData({
      primaryType: 'phone',
      primaryLabel: 'Call Now',
      secondaryEnabled: 'on',
      secondaryType: 'external_url',
      secondaryLabel: 'Book Online',
      secondaryValue: 'not-a-url',
    });
    const result = await updatePreviewCtaAction(EXISTING_PREVIEW.previewId, undefined, fd);
    expect(result?.errors?.secondaryValue).toBeDefined();
    expect(mockPutSitePreview).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updatePreviewCtaAction — success flow
// ---------------------------------------------------------------------------

describe('updatePreviewCtaAction — success flow', () => {
  it('saves a primary-only CTA config and redirects to the business page', async () => {
    const fd = makeFormData({ primaryType: 'phone', primaryLabel: 'Call Now' });

    await expect(
      updatePreviewCtaAction(EXISTING_PREVIEW.previewId, undefined, fd),
    ).rejects.toThrow(`REDIRECT:/admin/businesses/${EXISTING_PREVIEW.businessId}`);

    const saved = mockPutSitePreview.mock.calls[0][0] as SitePreview;
    expect(saved.content.cta).toEqual({ primary: { type: 'phone', label: 'Call Now' } });
    // Legacy hero.ctaText is kept in sync with the new primary label.
    expect(saved.content.hero.ctaText).toBe('Call Now');
    // An explicit CTA edit always persists onto Business.cta too, so it
    // survives every future "Generate Website" regeneration — see the
    // Business.cta doc comment.
    expect(mockUpdateBusiness).toHaveBeenCalledWith(EXISTING_PREVIEW.businessId, {
      cta: { primary: { type: 'phone', label: 'Call Now' } },
    });
  });

  it('saves a primary + secondary CTA config with an override value', async () => {
    const fd = makeFormData({
      primaryType: 'external_url',
      primaryLabel: 'Book Online',
      primaryValue: 'https://calendly.com/acme',
      secondaryEnabled: 'on',
      secondaryType: 'email',
      secondaryLabel: 'Email Us',
      secondaryValue: 'sales@acme.com',
    });

    await expect(
      updatePreviewCtaAction(EXISTING_PREVIEW.previewId, undefined, fd),
    ).rejects.toThrow('REDIRECT:');

    const saved = mockPutSitePreview.mock.calls[0][0] as SitePreview;
    expect(saved.content.cta).toEqual({
      primary: { type: 'external_url', label: 'Book Online', value: 'https://calendly.com/acme' },
      secondary: { type: 'email', label: 'Email Us', value: 'sales@acme.com' },
    });
  });

  it('omits the secondary CTA entirely when the checkbox is unchecked', async () => {
    const fd = makeFormData({
      primaryType: 'phone',
      primaryLabel: 'Call Now',
      secondaryType: 'email',
      secondaryLabel: 'Email Us',
    });

    await expect(
      updatePreviewCtaAction(EXISTING_PREVIEW.previewId, undefined, fd),
    ).rejects.toThrow('REDIRECT:');

    const saved = mockPutSitePreview.mock.calls[0][0] as SitePreview;
    expect(saved.content.cta?.secondary).toBeUndefined();
  });

  it('preserves the rest of the preview content unchanged', async () => {
    const fd = makeFormData({ primaryType: 'phone', primaryLabel: 'Call Now' });

    await expect(
      updatePreviewCtaAction(EXISTING_PREVIEW.previewId, undefined, fd),
    ).rejects.toThrow('REDIRECT:');

    const saved = mockPutSitePreview.mock.calls[0][0] as SitePreview;
    expect(saved.content.services).toEqual(EXISTING_PREVIEW.content.services);
    expect(saved.content.tagline).toBe(EXISTING_PREVIEW.content.tagline);
    expect(saved.version).toBe(EXISTING_PREVIEW.version);
    expect(saved.previewId).toBe(EXISTING_PREVIEW.previewId);
  });
});

// ---------------------------------------------------------------------------
// updatePreviewCtaAction — auth / not found
// ---------------------------------------------------------------------------

describe('updatePreviewCtaAction — auth', () => {
  it('returns Unauthorized when session is missing', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const fd = makeFormData({ primaryType: 'phone', primaryLabel: 'Call Now' });
    const result = await updatePreviewCtaAction(EXISTING_PREVIEW.previewId, undefined, fd);
    expect(result?.message).toBe('Unauthorized');
    expect(mockPutSitePreview).not.toHaveBeenCalled();
  });
});

describe('updatePreviewCtaAction — not found', () => {
  it('returns an error message when the preview does not exist', async () => {
    mockGetSitePreviewById.mockResolvedValueOnce(null);
    const fd = makeFormData({ primaryType: 'phone', primaryLabel: 'Call Now' });
    const result = await updatePreviewCtaAction('preview_notfound', undefined, fd);
    expect(result?.message).toBe('Preview not found');
    expect(mockPutSitePreview).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateAdminFieldsAction — `status` is no longer admin-settable; only
// `source` is written. A `status` field present in submitted form data
// (e.g. a stale client) is simply ignored, never validated or persisted.
// ---------------------------------------------------------------------------

describe('updateAdminFieldsAction', () => {
  it('updates only source, leaving status untouched', async () => {
    const fd = makeFormData({ source: 'google_places' });
    await expect(updateAdminFieldsAction(EXISTING_BUSINESS.businessId, '/admin/businesses/biz_1', undefined, fd)).rejects.toThrow(
      'REDIRECT:/admin/businesses/biz_1',
    );

    expect(mockPutBusiness).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'google_places', status: EXISTING_BUSINESS.status }),
    );
  });

  it('ignores a status field present in submitted form data — not validated, not written', async () => {
    const fd = makeFormData({ source: 'manual', status: 'customer' });
    await expect(updateAdminFieldsAction(EXISTING_BUSINESS.businessId, '/admin/businesses/biz_1', undefined, fd)).rejects.toThrow(
      'REDIRECT:/admin/businesses/biz_1',
    );

    expect(mockPutBusiness).toHaveBeenCalledWith(expect.objectContaining({ status: EXISTING_BUSINESS.status }));
  });

  it('returns Unauthorized when session is missing', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const fd = makeFormData({ source: 'manual' });
    const result = await updateAdminFieldsAction(EXISTING_BUSINESS.businessId, '/admin/businesses/biz_1', undefined, fd);
    expect(result?.message).toBe('Unauthorized');
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });
});
