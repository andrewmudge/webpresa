/**
 * Unit tests for generateAndSaveWebsite — the Stage 11 generation pipeline
 * (cap check, OpenAI call, persist, theme/CTA seeding), extracted from
 * `businesses/[businessId]/actions.ts`'s `runWebsiteGeneration` so Stage 16's
 * no-website workflow branch can call it directly. The thin Server Action
 * wrapper (`generateWebsiteAction`) is tested separately in
 * `businesses/[businessId]/__tests__/actions.test.ts` — these tests cover the
 * actual generation/persistence behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetBusinessById,
  mockUpdateBusiness,
  mockListPreviewsForBusiness,
  mockPutSitePreview,
  mockGeneratePreviewContent,
} = vi.hoisted(() => ({
  mockGetBusinessById: vi.fn(),
  mockUpdateBusiness: vi.fn(),
  mockListPreviewsForBusiness: vi.fn(),
  mockPutSitePreview: vi.fn(),
  mockGeneratePreviewContent: vi.fn(),
}));

vi.mock('@/lib/db/businesses', () => ({
  getBusinessById: mockGetBusinessById,
  updateBusiness: mockUpdateBusiness,
}));

vi.mock('@/lib/db/site-previews', () => ({
  listPreviewsForBusiness: mockListPreviewsForBusiness,
  putSitePreview: mockPutSitePreview,
}));

vi.mock('@/lib/ai/generate-preview', () => ({
  generatePreviewContent: mockGeneratePreviewContent,
}));

vi.mock('server-only', () => ({}));

import { generateAndSaveWebsite, MAX_AI_GENERATIONS } from '@/lib/ai/generate-and-save-preview';
import type { Business } from '@/domain/models/business';
import type { SitePreview } from '@/domain/models/site-preview';

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

const EXISTING_PREVIEW: SitePreview = {
  previewId: 'preview_00000000-0000-0000-0000-000000000001',
  businessId: EXISTING_BUSINESS.businessId,
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

const GENERATED = {
  content: {
    hero: { headline: 'Reliable Plumbing', subheadline: 'Fast, honest service.', ctaText: 'Call Now' },
    services: [{ name: 'Drain Cleaning', description: 'Fast drain service.' }],
    tagline: 'Trusted local plumbing.',
    aboutText: 'We are Acme Plumbing.',
    contact: { phone: '512-555-0100' },
    cta: { primary: { type: 'phone' as const, label: 'Call Now' } },
  },
  theme: { themeName: 'classicBlue' as const, fontFamily: 'sans-serif', heroStyle: 'solid' as const },
  metadata: { model: 'gpt-4o-mini', promptVersion: '2026-07-13', generatedAt: new Date().toISOString(), durationMs: 500 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetBusinessById.mockResolvedValue(EXISTING_BUSINESS);
  mockListPreviewsForBusiness.mockResolvedValue([]);
  mockGeneratePreviewContent.mockResolvedValue(GENERATED);
  mockPutSitePreview.mockResolvedValue(undefined);
  mockUpdateBusiness.mockResolvedValue(EXISTING_BUSINESS);
});

describe('generateAndSaveWebsite — success flow', () => {
  it('creates a draft SitePreview with generationMetadata', async () => {
    const result = await generateAndSaveWebsite(EXISTING_BUSINESS.businessId);

    expect(result.status).toBe('completed');
    expect(result.previewId).toBeDefined();
    expect(mockPutSitePreview).toHaveBeenCalledOnce();
    const saved = mockPutSitePreview.mock.calls[0][0];
    expect(saved.status).toBe('draft');
    expect(saved.generationMetadata).toEqual(GENERATED.metadata);
    expect(saved.content.hero.headline).toBe('Reliable Plumbing');
  });

  it('persists the resolved theme onto the business when it has none stored yet', async () => {
    await generateAndSaveWebsite(EXISTING_BUSINESS.businessId);
    expect(mockUpdateBusiness).toHaveBeenCalledWith(EXISTING_BUSINESS.businessId, { theme: 'classicBlue' });
  });

  it('persists the generated CTA onto the business when it has none stored yet', async () => {
    await generateAndSaveWebsite(EXISTING_BUSINESS.businessId);
    expect(mockUpdateBusiness).toHaveBeenCalledWith(EXISTING_BUSINESS.businessId, { cta: GENERATED.content.cta });
  });

  it('does not overwrite a business theme or CTA that are already stored', async () => {
    mockGetBusinessById.mockResolvedValue({
      ...EXISTING_BUSINESS,
      theme: 'green',
      cta: { primary: { type: 'phone' as const, label: 'Existing CTA' } },
    });

    await generateAndSaveWebsite(EXISTING_BUSINESS.businessId);

    expect(mockUpdateBusiness).not.toHaveBeenCalled();
  });

  it('increments the version from the highest existing preview', async () => {
    mockListPreviewsForBusiness.mockResolvedValueOnce([
      { ...EXISTING_PREVIEW, version: 1 },
      { ...EXISTING_PREVIEW, version: 3 },
    ]);

    await generateAndSaveWebsite(EXISTING_BUSINESS.businessId);

    const saved = mockPutSitePreview.mock.calls[0][0];
    expect(saved.version).toBe(4);
  });
});

describe('generateAndSaveWebsite — eligibility', () => {
  it('falls back to a per-industry default and persists it when the business has no services listed', async () => {
    mockGetBusinessById.mockResolvedValueOnce({ ...EXISTING_BUSINESS, industry: 'plumbing', servicesOffered: undefined });

    const result = await generateAndSaveWebsite(EXISTING_BUSINESS.businessId);

    expect(result.status).toBe('completed');
    expect(mockUpdateBusiness).toHaveBeenCalledWith(
      EXISTING_BUSINESS.businessId,
      { servicesOffered: expect.stringContaining('Drain cleaning') },
    );
    expect(mockGeneratePreviewContent).toHaveBeenCalledWith(
      expect.objectContaining({ servicesOffered: expect.stringContaining('Drain cleaning') }),
    );
    expect(mockPutSitePreview).toHaveBeenCalledOnce();
  });

  it('enforces the AI generation cap', async () => {
    mockListPreviewsForBusiness.mockResolvedValueOnce(
      Array.from({ length: MAX_AI_GENERATIONS }, () => ({ ...EXISTING_PREVIEW, generationMetadata: GENERATED.metadata })),
    );

    const result = await generateAndSaveWebsite(EXISTING_BUSINESS.businessId);

    expect(result.status).toBe('not_eligible');
    expect(result.message).toMatch(/limit/i);
    expect(mockGeneratePreviewContent).not.toHaveBeenCalled();
  });

  it('does not count seed previews (no generationMetadata) toward the cap', async () => {
    mockListPreviewsForBusiness.mockResolvedValueOnce([
      { ...EXISTING_PREVIEW },
      { ...EXISTING_PREVIEW },
      { ...EXISTING_PREVIEW },
    ]);

    const result = await generateAndSaveWebsite(EXISTING_BUSINESS.businessId);

    expect(result.status).toBe('completed');
    expect(mockGeneratePreviewContent).toHaveBeenCalledOnce();
  });
});

describe('generateAndSaveWebsite — not found and error handling', () => {
  it('returns failed when the business does not exist', async () => {
    mockGetBusinessById.mockResolvedValueOnce(null);
    const result = await generateAndSaveWebsite('biz_notfound');
    expect(result.status).toBe('failed');
    expect(result.message).toBe('Business not found.');
  });

  it('returns a safe generic message when generation throws, without leaking the raw error', async () => {
    mockGeneratePreviewContent.mockRejectedValueOnce(new Error('OpenAI rate limit exceeded: sk-abc123'));

    const result = await generateAndSaveWebsite(EXISTING_BUSINESS.businessId);

    expect(result.status).toBe('failed');
    expect(result.message).toBe('Failed to generate website. Please try again.');
    expect(result.message).not.toContain('sk-abc123');
    expect(mockPutSitePreview).not.toHaveBeenCalled();
  });
});
