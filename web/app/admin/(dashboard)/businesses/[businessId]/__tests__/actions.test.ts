/**
 * Unit tests for updatePreviewCtaAction (the preview CTA editor's server action).
 * All DynamoDB interactions and auth are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock functions
// ---------------------------------------------------------------------------

const {
  mockGetSitePreviewById,
  mockPutSitePreview,
  mockListPreviewsForBusiness,
  mockDeletePreviewById,
  mockListScansForBusiness,
  mockDeleteScanEventById,
  mockListPostcardsForBusiness,
  mockDeletePostcardById,
  mockGetBusinessById,
  mockDeleteBusinessById,
  mockGetSession,
  mockGeneratePreviewContent,
} = vi.hoisted(() => ({
  mockGetSitePreviewById: vi.fn(),
  mockPutSitePreview: vi.fn(),
  mockListPreviewsForBusiness: vi.fn(),
  mockDeletePreviewById: vi.fn(),
  mockListScansForBusiness: vi.fn(),
  mockDeleteScanEventById: vi.fn(),
  mockListPostcardsForBusiness: vi.fn(),
  mockDeletePostcardById: vi.fn(),
  mockGetBusinessById: vi.fn(),
  mockDeleteBusinessById: vi.fn(),
  mockGetSession: vi.fn(),
  mockGeneratePreviewContent: vi.fn(),
}));

vi.mock('@/lib/ai/generate-preview', () => ({
  generatePreviewContent: mockGeneratePreviewContent,
}));

vi.mock('@/lib/db/site-previews', () => ({
  getSitePreviewById: mockGetSitePreviewById,
  putSitePreview: mockPutSitePreview,
  listPreviewsForBusiness: mockListPreviewsForBusiness,
  deletePreviewById: mockDeletePreviewById,
}));

vi.mock('@/lib/db/scan-events', () => ({
  listScansForBusiness: mockListScansForBusiness,
  deleteScanEventById: mockDeleteScanEventById,
}));

vi.mock('@/lib/db/postcards', () => ({
  listPostcardsForBusiness: mockListPostcardsForBusiness,
  deletePostcardById: mockDeletePostcardById,
}));

vi.mock('@/lib/db/businesses', () => ({
  getBusinessById: mockGetBusinessById,
  deleteBusinessById: mockDeleteBusinessById,
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: mockGetSession,
}));

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { updatePreviewCtaAction, generateWebsiteAction } from '@/app/admin/(dashboard)/businesses/[businessId]/actions';
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

const GENERATED = {
  content: {
    hero: { headline: 'Reliable Plumbing', subheadline: 'Fast, honest service.', ctaText: 'Call Now' },
    services: [{ name: 'Drain Cleaning', description: 'Fast drain service.' }],
    tagline: 'Trusted local plumbing.',
    aboutText: 'We are Acme Plumbing.',
    contact: { phone: '512-555-0100' },
    cta: { primary: { type: 'phone' as const, label: 'Call Now' } },
  },
  theme: { primaryColor: '#0F356B', accentColor: '#ED7023', fontFamily: 'sans-serif', heroStyle: 'solid' as const },
  metadata: { model: 'gpt-4o-mini', promptVersion: '2026-07-13', generatedAt: new Date().toISOString(), durationMs: 500 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ sub: 'admin', expiresAt: new Date().toISOString() });
  mockGetSitePreviewById.mockResolvedValue(EXISTING_PREVIEW);
  mockPutSitePreview.mockResolvedValue(undefined);
  mockGetBusinessById.mockResolvedValue(EXISTING_BUSINESS);
  mockListPreviewsForBusiness.mockResolvedValue([]);
  mockGeneratePreviewContent.mockResolvedValue(GENERATED);
});

// ---------------------------------------------------------------------------
// generateWebsiteAction
// ---------------------------------------------------------------------------

describe('generateWebsiteAction — success flow', () => {
  it('creates a draft SitePreview with generationMetadata and redirects', async () => {
    await expect(
      generateWebsiteAction(EXISTING_BUSINESS.businessId, undefined, new FormData()),
    ).rejects.toThrow(`REDIRECT:/admin/businesses/${EXISTING_BUSINESS.businessId}`);

    expect(mockPutSitePreview).toHaveBeenCalledOnce();
    const saved = mockPutSitePreview.mock.calls[0][0];
    expect(saved.status).toBe('draft');
    expect(saved.generationMetadata).toEqual(GENERATED.metadata);
    expect(saved.content.hero.headline).toBe('Reliable Plumbing');
  });

  it('increments the version from the highest existing preview', async () => {
    mockListPreviewsForBusiness.mockResolvedValueOnce([
      { ...EXISTING_PREVIEW, version: 1 },
      { ...EXISTING_PREVIEW, version: 3 },
    ]);

    await expect(
      generateWebsiteAction(EXISTING_BUSINESS.businessId, undefined, new FormData()),
    ).rejects.toThrow('REDIRECT:');

    const saved = mockPutSitePreview.mock.calls[0][0];
    expect(saved.version).toBe(4);
  });
});

describe('generateWebsiteAction — validation', () => {
  it('rejects when the business has no services listed', async () => {
    mockGetBusinessById.mockResolvedValueOnce({ ...EXISTING_BUSINESS, servicesOffered: undefined });

    const result = await generateWebsiteAction(EXISTING_BUSINESS.businessId, undefined, new FormData());

    expect(result?.message).toMatch(/at least one service/i);
    expect(mockGeneratePreviewContent).not.toHaveBeenCalled();
    expect(mockPutSitePreview).not.toHaveBeenCalled();
  });

  it('enforces the AI generation cap', async () => {
    mockListPreviewsForBusiness.mockResolvedValueOnce([
      { ...EXISTING_PREVIEW, generationMetadata: GENERATED.metadata },
      { ...EXISTING_PREVIEW, generationMetadata: GENERATED.metadata },
      { ...EXISTING_PREVIEW, generationMetadata: GENERATED.metadata },
    ]);

    const result = await generateWebsiteAction(EXISTING_BUSINESS.businessId, undefined, new FormData());

    expect(result?.message).toMatch(/limit/i);
    expect(mockGeneratePreviewContent).not.toHaveBeenCalled();
  });

  it('does not count seed previews (no generationMetadata) toward the cap', async () => {
    mockListPreviewsForBusiness.mockResolvedValueOnce([
      { ...EXISTING_PREVIEW },
      { ...EXISTING_PREVIEW },
      { ...EXISTING_PREVIEW },
    ]);

    await expect(
      generateWebsiteAction(EXISTING_BUSINESS.businessId, undefined, new FormData()),
    ).rejects.toThrow('REDIRECT:');

    expect(mockGeneratePreviewContent).toHaveBeenCalledOnce();
  });
});

describe('generateWebsiteAction — auth and error handling', () => {
  it('returns Unauthorized when session is missing', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const result = await generateWebsiteAction(EXISTING_BUSINESS.businessId, undefined, new FormData());
    expect(result?.message).toBe('Unauthorized');
    expect(mockGeneratePreviewContent).not.toHaveBeenCalled();
  });

  it('returns a not-found message when the business does not exist', async () => {
    mockGetBusinessById.mockResolvedValueOnce(null);
    const result = await generateWebsiteAction('biz_notfound', undefined, new FormData());
    expect(result?.message).toBe('Business not found');
  });

  it('returns a safe generic message when generation throws, without leaking the raw error', async () => {
    mockGeneratePreviewContent.mockRejectedValueOnce(new Error('OpenAI rate limit exceeded: sk-abc123'));

    const result = await generateWebsiteAction(EXISTING_BUSINESS.businessId, undefined, new FormData());

    expect(result?.message).toBe('Failed to generate website. Please try again.');
    expect(result?.message).not.toContain('sk-abc123');
    expect(mockPutSitePreview).not.toHaveBeenCalled();
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
