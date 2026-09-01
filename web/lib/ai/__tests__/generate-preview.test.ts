/**
 * Unit tests for generatePreviewContent.
 * The OpenAI client is mocked — no real API calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockParse = vi.hoisted(() => vi.fn());
const mockGetOpenAiClient = vi.hoisted(() => vi.fn());
const mockResolveBusinessTheme = vi.hoisted(() => vi.fn());
const mockResolveHeroImages = vi.hoisted(() => vi.fn());

vi.mock('@/lib/ai/client', () => ({
  getOpenAiClient: mockGetOpenAiClient,
  getOpenAiModel: () => 'gpt-4o-mini',
}));

vi.mock('@/lib/theme/select-theme', () => ({
  resolveBusinessTheme: mockResolveBusinessTheme,
}));

// Hero/mobile-hero resolution is fully delegated to resolveHeroImages — its
// own tier-chain logic (admin override, Firecrawl dimension match, stock
// industry fallback, illustration) is covered in
// lib/image/__tests__/resolve-hero-image.test.ts. Mocked here at the
// boundary so this file only needs to verify generatePreviewContent wires
// its result into `theme` correctly, and passes it the right inputs.
vi.mock('@/lib/image/resolve-hero-image', () => ({
  resolveHeroImages: mockResolveHeroImages,
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
  mockResolveHeroImages.mockResolvedValue({ heroImageUrl: undefined, heroImageUrlMobile: undefined, heroStyle: 'illustration' });
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

  it('wires resolveHeroImages\' resolved desktop/mobile hero and style into theme', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    mockResolveHeroImages.mockResolvedValueOnce({
      heroImageUrl: '/api/assets/scans/biz_1/scan_1/images/img1.jpg',
      heroImageUrlMobile: 'https://cdn.example.cloudfront.net/hero-sets/plumbing/set1/mobile.jpg',
      heroStyle: 'image',
    });
    const business = makeBusiness();

    const result = await generatePreviewContent(business);

    expect(result.theme.heroImageUrl).toBe('/api/assets/scans/biz_1/scan_1/images/img1.jpg');
    expect(result.theme.heroImageUrlMobile).toBe('https://cdn.example.cloudfront.net/hero-sets/plumbing/set1/mobile.jpg');
    expect(result.theme.heroStyle).toBe('image');
  });

  it('passes the business and its accepted scan images through to resolveHeroImages, excluding review_required ones', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness();
    const scanImages = [
      { imageId: 'img1', role: 'hero' as const, status: 'accepted' as const, url: '/api/assets/scans/biz_1/scan_1/images/img1.jpg', originalUrl: 'https://acme.com/hero.jpg' },
      { imageId: 'img2', role: 'gallery' as const, status: 'review_required' as const, originalUrl: 'https://acme.com/other.jpg' },
    ];

    await generatePreviewContent(business, {
      enrichment: { snapshot: { schemaVersion: '1', sourceUrl: 'https://acme.com/', services: [], serviceAreas: [], differentiators: [], faq: [], navigationLabels: [], callsToAction: [], contact: { phones: [], emails: [], addresses: [] }, socialLinks: [], links: [], imageReferences: [], extractedAt: new Date().toISOString() }, scanImages, scanId: 'scan_1' },
    });

    expect(mockResolveHeroImages).toHaveBeenCalledWith({
      business,
      acceptedScanImages: [expect.objectContaining({ imageId: 'img1', status: 'accepted' })],
    });
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

  it('lets an admin override pin a specific photo to the about slot, ignoring the automatic pick', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({
      photoUrls: ['/api/assets/businesses/biz_1/assets/photos/0.jpg', '/api/assets/businesses/biz_1/assets/photos/1.jpg'],
      whyChooseUsPhotoUrl: '/api/assets/businesses/biz_1/assets/photos/1.jpg',
    });

    const result = await generatePreviewContent(business);

    expect(result.theme.aboutImageUrl).toBe('/api/assets/businesses/biz_1/assets/photos/1.jpg');
  });

  it('lets an admin override force no photo for the about slot via "none", even when photos exist', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({
      photoUrls: ['/api/assets/businesses/biz_1/assets/photos/0.jpg'],
      whyChooseUsPhotoUrl: 'none',
    });

    const result = await generatePreviewContent(business);

    expect(result.theme.aboutImageUrl).toBeUndefined();
  });

  it('falls back to reusing earlier photos for services/about when fewer than 3 were uploaded', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({ photoUrls: ['/api/assets/businesses/biz_1/assets/photos/0.jpg'] });

    const result = await generatePreviewContent(business);

    expect(result.theme.aboutImageUrl).toBe('/api/assets/businesses/biz_1/assets/photos/0.jpg');
    expect(result.theme.servicesImageUrl).toBe('/api/assets/businesses/biz_1/assets/photos/0.jpg');
  });

  it('leaves servicesImageUrl unset when no photo was uploaded and the industry has no default', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({ industry: 'hvac', photoUrls: undefined });

    const result = await generatePreviewContent(business);

    expect(result.theme.servicesImageUrl).toBeUndefined();
  });

  it('falls back to the curated plumbing default images when nothing else resolves for about/why-choose-us/services', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({ photoUrls: undefined });

    const result = await generatePreviewContent(business);

    expect(result.theme.aboutImageUrl).toBe('/default-images/plumb2.jpg');
    expect(result.theme.servicesImageUrl).toBe('/default-images/plumb1.jpg');
    expect(result.theme.aboutSectionImageUrl).toBe('/default-images/plumb3.jpg');
  });

  it('leaves about/why-choose-us/services unset when no photo was uploaded and the industry has no default', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({ industry: 'hvac', photoUrls: undefined });

    const result = await generatePreviewContent(business);

    expect(result.theme.aboutImageUrl).toBeUndefined();
    expect(result.theme.servicesImageUrl).toBeUndefined();
    expect(result.theme.aboutSectionImageUrl).toBeUndefined();
  });

  it('prefers an uploaded photo over the plumbing default image', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({ photoUrls: ['/api/assets/businesses/biz_1/assets/photos/0.jpg'] });

    const result = await generatePreviewContent(business);

    expect(result.theme.aboutImageUrl).toBe('/api/assets/businesses/biz_1/assets/photos/0.jpg');
    expect(result.theme.aboutImageUrl).not.toBe('/default-images/plumb2.jpg');
  });

  it('lets an admin override force no photo for the about slot via "none" even when the plumbing default would otherwise apply', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({ photoUrls: undefined, whyChooseUsPhotoUrl: 'none' });

    const result = await generatePreviewContent(business);

    expect(result.theme.aboutImageUrl).toBeUndefined();
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
    differentiators: [],
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

  it('includes enrichment-sourced differentiators in the prompt when the business has none of its own', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: VALID_MODEL_OUTPUT } }] });
    const business = makeBusiness({ differentiators: undefined });
    const snapshotWithDifferentiators = { ...snapshot, differentiators: ['Family owned', '40+ years of experience'] };

    await generatePreviewContent(business, {
      enrichment: { snapshot: snapshotWithDifferentiators, scanImages: [], scanId: 'scan_1' },
    });

    const userMessage = mockParse.mock.calls[0][0].messages[1].content as string;
    expect(userMessage).toContain('Family owned');
    expect(userMessage).toContain('40+ years of experience');
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

  it('uses a second accepted scan image as an about-slot fallback when no business photo exists (the first is reserved as the designated hero candidate)', async () => {
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
      {
        imageId: 'img2',
        role: 'gallery' as const,
        status: 'accepted' as const,
        url: '/api/assets/scans/biz_1/scan_1/images/img2.jpg',
        originalUrl: 'https://acme.com/other.jpg',
      },
      {
        imageId: 'img3',
        role: 'gallery' as const,
        status: 'review_required' as const,
        originalUrl: 'https://acme.com/unused.jpg',
      },
    ];

    const result = await generatePreviewContent(business, { enrichment: { snapshot, scanImages, scanId: 'scan_1' } });

    expect(result.theme.aboutImageUrl).toBe('/api/assets/scans/biz_1/scan_1/images/img2.jpg');
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
