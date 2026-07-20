/**
 * Unit tests for generatePreviewContent.
 * The OpenAI client is mocked — no real API calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockParse = vi.hoisted(() => vi.fn());
const mockGetOpenAiClient = vi.hoisted(() => vi.fn());
const mockResolveBusinessTheme = vi.hoisted(() => vi.fn());
const mockCheckHeroPhotoDimensions = vi.hoisted(() => vi.fn());

vi.mock('@/lib/ai/client', () => ({
  getOpenAiClient: mockGetOpenAiClient,
  getOpenAiModel: () => 'gpt-4o-mini',
}));

vi.mock('@/lib/theme/select-theme', () => ({
  resolveBusinessTheme: mockResolveBusinessTheme,
}));

vi.mock('@/lib/image/hero-dimensions', () => ({
  checkHeroPhotoDimensions: mockCheckHeroPhotoDimensions,
}));

vi.mock('server-only', () => ({}));

import { generatePreviewContent } from '@/lib/ai/generate-preview';
import type { Business } from '@/domain/models/business';

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_00000000-0000-0000-0000-000000000001',
    slug: 'acme-plumbing',
    name: 'Acme Plumbing',
    industry: 'plumbing',
    source: 'manual',
    status: 'pending',
    servicesOffered: 'Drain cleaning\nWater heater repair',
    phone: '512-555-0100',
    email: 'hello@acme.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const VALID_MODEL_OUTPUT = {
  hero: { headline: 'Reliable Plumbing, Done Right', subheadline: 'Fast, honest service across the area.' },
  services: [
    { name: 'Drain Cleaning', description: 'Fast, thorough drain clearing.' },
    { name: 'Water Heater Repair', description: 'Same-day water heater diagnostics and repair.' },
  ],
  tagline: "Austin's trusted local plumber.",
  aboutText: 'Acme Plumbing has served the community for years with honest, reliable work.',
  differentiators: [{ title: 'Upfront Pricing', description: 'No surprises — you approve the price first.' }],
  primaryCtaLabel: 'Call Now',
  secondaryCtaLabel: 'Email Us',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  seoTitle: 'Acme Plumbing — Austin Plumber',
  seoDescription: 'Reliable plumbing repair and installation across Austin, TX.',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOpenAiClient.mockResolvedValue({
    chat: { completions: { parse: mockParse } },
  });
  mockResolveBusinessTheme.mockResolvedValue('classicBlue');
  mockCheckHeroPhotoDimensions.mockResolvedValue({ isFullBleedEligible: true, width: 1920, height: 1080 });
});

describe('generatePreviewContent — precondition', () => {
  it('throws when the business has no services listed', async () => {
    const business = makeBusiness({ servicesOffered: undefined });
    await expect(generatePreviewContent(business)).rejects.toThrow(/at least one service/i);
    expect(mockGetOpenAiClient).not.toHaveBeenCalled();
  });

  it('throws when servicesOffered is only whitespace', async () => {
    const business = makeBusiness({ servicesOffered: '   \n  ' });
    await expect(generatePreviewContent(business)).rejects.toThrow(/at least one service/i);
  });
});

describe('generatePreviewContent — success', () => {
  it('derives contact and CTA from the verified business record, not the model', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness();

    const result = await generatePreviewContent(business);

    expect(result.content.contact).toEqual({ phone: '512-555-0100', email: 'hello@acme.com' });
    expect(result.content.cta).toEqual({
      primary: { type: 'phone', label: 'Call Now' },
      secondary: { type: 'email', label: 'Email Us' },
    });
    expect(result.content.hero.ctaText).toBe('Call Now');
  });

  it('reuses a persisted Business.cta override verbatim, ignoring the model-supplied labels', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const storedCta = { primary: { type: 'external_url' as const, label: 'Book Online', value: 'https://booking.example.com' } };
    const business = makeBusiness({ cta: storedCta });

    const result = await generatePreviewContent(business);

    expect(result.content.cta).toEqual(storedCta);
    expect(result.content.hero.ctaText).toBe('Book Online');
  });

  it('uses the first uploaded photo as the hero image, setting heroStyle to image', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({ photoUrls: ['/api/assets/businesses/biz_1/assets/photos/0.jpg'] });

    const result = await generatePreviewContent(business);

    expect(result.theme.heroStyle).toBe('image');
    expect(result.theme.heroImageUrl).toBe('/api/assets/businesses/biz_1/assets/photos/0.jpg');
  });

  it('sets heroStyle to imageSplit when the hero photo is not hero-dimensioned', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    mockCheckHeroPhotoDimensions.mockResolvedValueOnce({ isFullBleedEligible: false, width: 1200, height: 800 });
    const business = makeBusiness({ photoUrls: ['/api/assets/businesses/biz_1/assets/photos/0.jpg'] });

    const result = await generatePreviewContent(business);

    expect(result.theme.heroStyle).toBe('imageSplit');
    expect(result.theme.heroImageUrl).toBe('/api/assets/businesses/biz_1/assets/photos/0.jpg');
  });

  it('reuses uploaded photos for the about/why-choose-us/services image slots, preferring later photos', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({
      photoUrls: [
        '/api/assets/businesses/biz_1/assets/photos/0.jpg',
        '/api/assets/businesses/biz_1/assets/photos/1.jpg',
        '/api/assets/businesses/biz_1/assets/photos/2.jpg',
        '/api/assets/businesses/biz_1/assets/photos/3.jpg',
      ],
    });

    const result = await generatePreviewContent(business);

    expect(result.theme.aboutImageUrl).toBe('/api/assets/businesses/biz_1/assets/photos/1.jpg');
    expect(result.theme.servicesImageUrl).toBe('/api/assets/businesses/biz_1/assets/photos/2.jpg');
    expect(result.theme.aboutSectionImageUrl).toBe('/api/assets/businesses/biz_1/assets/photos/3.jpg');
  });

  it('lets an admin override pin a specific photo to a slot, ignoring the automatic pick', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({
      photoUrls: ['/api/assets/businesses/biz_1/assets/photos/0.jpg', '/api/assets/businesses/biz_1/assets/photos/1.jpg'],
      heroPhotoUrl: '/api/assets/businesses/biz_1/assets/photos/1.jpg',
    });

    const result = await generatePreviewContent(business);

    expect(result.theme.heroImageUrl).toBe('/api/assets/businesses/biz_1/assets/photos/1.jpg');
  });

  it('lets an admin override force no photo for a slot via "none", even when photos exist', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({
      photoUrls: ['/api/assets/businesses/biz_1/assets/photos/0.jpg'],
      heroPhotoUrl: 'none',
    });

    const result = await generatePreviewContent(business);

    expect(result.theme.heroImageUrl).toBeUndefined();
    expect(result.theme.heroStyle).toBe('illustration');
  });

  it('falls back to reusing earlier photos for services/about when fewer than 3 were uploaded', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({ photoUrls: ['/api/assets/businesses/biz_1/assets/photos/0.jpg'] });

    const result = await generatePreviewContent(business);

    expect(result.theme.aboutImageUrl).toBe('/api/assets/businesses/biz_1/assets/photos/0.jpg');
    expect(result.theme.servicesImageUrl).toBe('/api/assets/businesses/biz_1/assets/photos/0.jpg');
  });

  it('leaves servicesImageUrl unset when no photo was uploaded', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({ photoUrls: undefined });

    const result = await generatePreviewContent(business);

    expect(result.theme.servicesImageUrl).toBeUndefined();
  });

  it('deterministically uses the illustration heroStyle when no photo was uploaded (never AI-chosen)', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({ photoUrls: undefined });

    const result = await generatePreviewContent(business);

    expect(result.theme.heroStyle).toBe('illustration');
    expect(result.theme.heroImageUrl).toBeUndefined();
  });

  it('includes generationMetadata with the resolved model name', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const result = await generatePreviewContent(makeBusiness());
    expect(result.metadata.model).toBe('gpt-4o-mini');
    expect(result.metadata.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('sets theme.themeName from the Brand Theme System selection, never a raw color', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    mockResolveBusinessTheme.mockResolvedValueOnce('green');

    const result = await generatePreviewContent(makeBusiness());

    expect(result.theme.themeName).toBe('green');
    expect(result.theme).not.toHaveProperty('primaryColor');
    expect(result.theme).not.toHaveProperty('accentColor');
  });
});

describe('generatePreviewContent — Stage 13 enrichment (optional third argument)', () => {
  const snapshot = {
    schemaVersion: '1' as const,
    sourceUrl: 'https://acme.com/',
    services: [{ name: 'Sewer Line Repair' }],
    serviceAreas: ['Austin'],
    faq: [],
    navigationLabels: [],
    callsToAction: [],
    contact: { phones: [], emails: [], addresses: [] },
    socialLinks: [],
    links: [],
    imageReferences: [],
    extractedAt: new Date().toISOString(),
  };

  it('is unaffected when called with no enrichment — sets source to manual_ai', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const result = await generatePreviewContent(makeBusiness());
    expect(result.metadata.source).toBe('manual_ai');
    expect(result.metadata.scanId).toBeUndefined();
  });

  it('creates a preview using enrichment-sourced services when the business has none of its own (Stage 12 import case)', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({ servicesOffered: undefined, source: 'google_places' });

    const result = await generatePreviewContent(business, {
      enrichment: { snapshot, scanImages: [], scanId: 'scan_1' },
    });

    expect(result.metadata.source).toBe('firecrawl_enriched');
    expect(result.metadata.scanId).toBe('scan_1');
    expect(mockGetOpenAiClient).toHaveBeenCalled();
  });

  it('fills in the generated preview\'s contact email from the snapshot when the business has none on file', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({ email: undefined });
    const snapshotWithEmail = { ...snapshot, contact: { phones: [], emails: ['aaa1paulsplumbing@yahoo.com'], addresses: [] } };

    const result = await generatePreviewContent(business, {
      enrichment: { snapshot: snapshotWithEmail, scanImages: [], scanId: 'scan_1' },
    });

    expect(result.content.contact.email).toBe('aaa1paulsplumbing@yahoo.com');
    // The business's own phone still wins outright.
    expect(result.content.contact.phone).toBe('512-555-0100');
  });

  it('does not let a found email override the business\'s own email', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({ email: 'owner@acme.com' });
    const snapshotWithEmail = { ...snapshot, contact: { phones: [], emails: ['found@somewhere.com'], addresses: [] } };

    const result = await generatePreviewContent(business, {
      enrichment: { snapshot: snapshotWithEmail, scanImages: [], scanId: 'scan_1' },
    });

    expect(result.content.contact.email).toBe('owner@acme.com');
  });

  it('populates content.socialLinks from the enrichment snapshot, classified by platform', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness();
    const snapshotWithSocial = {
      ...snapshot,
      socialLinks: ['https://www.facebook.com/acme', 'https://instagram.com/acme', 'https://acme-unrelated.com'],
    };

    const result = await generatePreviewContent(business, {
      enrichment: { snapshot: snapshotWithSocial, scanImages: [], scanId: 'scan_1' },
    });

    expect(result.content.socialLinks).toEqual([
      { platform: 'facebook', url: 'https://www.facebook.com/acme' },
      { platform: 'instagram', url: 'https://instagram.com/acme' },
      { platform: 'other', url: 'https://acme-unrelated.com' },
    ]);
  });

  it('leaves content.socialLinks unset when the snapshot has none, or there is no enrichment', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const noEnrichmentResult = await generatePreviewContent(makeBusiness());
    expect(noEnrichmentResult.content.socialLinks).toBeUndefined();

    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const emptySocialResult = await generatePreviewContent(makeBusiness(), {
      enrichment: { snapshot, scanImages: [], scanId: 'scan_1' },
    });
    expect(emptySocialResult.content.socialLinks).toBeUndefined();
  });

  it('still throws when neither the business nor the enrichment snapshot has any services', async () => {
    const business = makeBusiness({ servicesOffered: undefined });
    const emptySnapshot = { ...snapshot, services: [] };
    await expect(
      generatePreviewContent(business, { enrichment: { snapshot: emptySnapshot, scanImages: [], scanId: 'scan_1' } }),
    ).rejects.toThrow(/at least one service/i);
  });

  it('uses an accepted scan image as the hero fallback only when no business photo exists', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({ photoUrls: undefined });
    const scanImages = [
      {
        imageId: 'img1',
        role: 'hero' as const,
        status: 'accepted' as const,
        url: '/api/assets/scans/biz_1/scan_1/images/img1.jpg',
        originalUrl: 'https://acme.com/hero.jpg',
      },
    ];

    const result = await generatePreviewContent(business, { enrichment: { snapshot, scanImages, scanId: 'scan_1' } });

    expect(result.theme.heroImageUrl).toBe('/api/assets/scans/biz_1/scan_1/images/img1.jpg');
  });

  it('prefers an uploaded business photo over a scan-derived image for the hero slot', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({ photoUrls: ['/api/assets/businesses/biz_1/assets/photos/0.jpg'] });
    const scanImages = [
      {
        imageId: 'img1',
        role: 'hero' as const,
        status: 'accepted' as const,
        url: '/api/assets/scans/biz_1/scan_1/images/img1.jpg',
        originalUrl: 'https://acme.com/hero.jpg',
      },
    ];

    const result = await generatePreviewContent(business, { enrichment: { snapshot, scanImages, scanId: 'scan_1' } });

    expect(result.theme.heroImageUrl).toBe('/api/assets/businesses/biz_1/assets/photos/0.jpg');
  });

  it('ignores a review_required (not accepted) scan image as a photo-slot fallback', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({ photoUrls: undefined });
    const scanImages = [
      {
        imageId: 'img1',
        role: 'hero' as const,
        status: 'review_required' as const,
        originalUrl: 'https://acme.com/hero.jpg',
      },
    ];

    const result = await generatePreviewContent(business, { enrichment: { snapshot, scanImages, scanId: 'scan_1' } });

    expect(result.theme.heroImageUrl).toBeUndefined();
  });
});

describe('generatePreviewContent — model failure handling', () => {
  it('throws a clear error when the model returns no parsable output', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: null } }] });
    await expect(generatePreviewContent(makeBusiness())).rejects.toThrow(/no parsable structured output/i);
  });

  it('propagates errors from the OpenAI client rather than swallowing them', async () => {
    mockParse.mockRejectedValueOnce(new Error('OpenAI API error: rate limited'));
    await expect(generatePreviewContent(makeBusiness())).rejects.toThrow(/rate limited/);
  });
});
