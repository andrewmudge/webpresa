/**
 * Unit tests for the automatic hero-image tier chain: admin override →
 * Firecrawl dimension-matched hero → curated stock-by-industry → theme
 * illustration. Desktop and mobile stock images are looked up as two
 * entirely independent queries (`getDefaultHeroImage(industry, 'desktop')`
 * / `getDefaultHeroImage(industry, 'mobile')`) — an industry may have one
 * without the other. Mobile only shows a genuinely separate photo when one
 * exists; otherwise it reuses the resolved desktop photo as a preview.
 * `checkHeroPhotoDimensions` and `getDefaultHeroImage` are mocked — no real
 * image processing, S3, or DynamoDB calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCheckHeroPhotoDimensions = vi.hoisted(() => vi.fn());
const mockGetDefaultHeroImage = vi.hoisted(() => vi.fn());

vi.mock('@/lib/image/hero-dimensions', () => ({
  checkHeroPhotoDimensions: mockCheckHeroPhotoDimensions,
  HERO_FULL_BLEED_DIMENSIONS: [
    { width: 1920, height: 1080 },
    { width: 1600, height: 900 },
  ],
  HERO_DIMENSION_TOLERANCE_PX: 100,
}));

vi.mock('@/lib/db/stock-images', () => ({
  getDefaultHeroImage: mockGetDefaultHeroImage,
}));

vi.mock('server-only', () => ({}));

import { resolveHeroImages } from '@/lib/image/resolve-hero-image';
import type { Business } from '@/domain/models/business';
import type { ScanImageAsset } from '@/domain/models/scan-image';
import type { StockImage } from '@/domain/models/stock-image';

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_00000000-0000-0000-0000-000000000001',
    slug: 'acme-plumbing',
    name: 'Acme Plumbing',
    industry: 'plumbing',
    source: 'manual',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeScanImage(overrides: Partial<ScanImageAsset> = {}): ScanImageAsset {
  return {
    imageId: 'img1',
    role: 'hero',
    status: 'accepted',
    url: '/api/assets/scans/biz_1/scan_1/images/img1.jpg',
    originalUrl: 'https://acme.com/hero.jpg',
    ...overrides,
  };
}

function makeStockImage(overrides: Partial<StockImage> = {}): StockImage {
  return {
    stockImageId: 'stock_00000000-0000-0000-0000-000000000001',
    kind: 'hero',
    variant: 'desktop',
    industry: 'plumbing',
    image: { s3Key: 'hero/desktop/plumbing/img1.jpg', url: 'https://cdn.example.cloudfront.net/hero/desktop/plumbing/img1.jpg', width: 1920, height: 1080 },
    status: 'active',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const STOCK_DESKTOP = makeStockImage();
const STOCK_MOBILE = makeStockImage({
  stockImageId: 'stock_00000000-0000-0000-0000-000000000002',
  variant: 'mobile',
  image: { s3Key: 'hero/mobile/plumbing/img2.jpg', url: 'https://cdn.example.cloudfront.net/hero/mobile/plumbing/img2.jpg', width: 1080, height: 1350 },
});

/** Mocks `getDefaultHeroImage` per-variant, matching the two independent lookups `resolveHeroImages` makes. */
function mockStock({ desktop = null, mobile = null }: { desktop?: StockImage | null; mobile?: StockImage | null }) {
  mockGetDefaultHeroImage.mockImplementation(async (_industry: string, variant: 'desktop' | 'mobile') =>
    variant === 'desktop' ? desktop : mobile,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mockGetDefaultHeroImage.mockResolvedValue(null);
});

describe('tier 1 — explicit admin override', () => {
  it('wins outright, checking its dimensions for heroStyle', async () => {
    mockCheckHeroPhotoDimensions.mockResolvedValueOnce({ isFullBleedEligible: true, width: 1920, height: 1080 });
    const business = makeBusiness({ heroPhotoUrl: '/api/assets/businesses/biz_1/assets/photos/0.jpg' });

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(result.heroImageUrl).toBe('/api/assets/businesses/biz_1/assets/photos/0.jpg');
    expect(result.heroStyle).toBe('image');
    expect(mockGetDefaultHeroImage).not.toHaveBeenCalled();
  });

  it('renders imageSplit when the overridden photo is not hero-dimensioned', async () => {
    mockCheckHeroPhotoDimensions.mockResolvedValueOnce({ isFullBleedEligible: false, width: 1200, height: 800 });
    const business = makeBusiness({ heroPhotoUrl: '/api/assets/businesses/biz_1/assets/photos/0.jpg' });

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(result.heroStyle).toBe('imageSplit');
  });

  it('"none" forces no photo, even with a qualifying Firecrawl image or stock images available', async () => {
    mockStock({ desktop: STOCK_DESKTOP, mobile: STOCK_MOBILE });
    const business = makeBusiness({ heroPhotoUrl: 'none' });
    const acceptedScanImages = [makeScanImage({ width: 1920, height: 1080 })];

    const result = await resolveHeroImages({ business, acceptedScanImages });

    expect(result.heroImageUrl).toBeUndefined();
    expect(result.heroStyle).toBe('illustration');
    expect(result.heroImageUrlMobile).toBeUndefined();
  });

  it('mobile reuses the same overridden desktop photo when no dedicated mobile override is set', async () => {
    mockCheckHeroPhotoDimensions.mockResolvedValueOnce({ isFullBleedEligible: true, width: 1920, height: 1080 });
    const business = makeBusiness({ heroPhotoUrl: '/api/assets/businesses/biz_1/assets/photos/0.jpg' });

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(result.heroImageUrlMobile).toBe('/api/assets/businesses/biz_1/assets/photos/0.jpg');
  });

  it('a dedicated heroPhotoUrlMobile override is a genuinely separate photo, never derived from the desktop upload', async () => {
    mockCheckHeroPhotoDimensions.mockResolvedValueOnce({ isFullBleedEligible: true, width: 1920, height: 1080 });
    const business = makeBusiness({
      heroPhotoUrl: '/api/assets/businesses/biz_1/assets/photos/0.jpg',
      heroPhotoUrlMobile: '/api/assets/businesses/biz_1/assets/photos/1.jpg',
    });

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(result.heroImageUrlMobile).toBe('/api/assets/businesses/biz_1/assets/photos/1.jpg');
  });
});

describe('tier 2 — Firecrawl dimension-matched hero image', () => {
  it('is used when a role:"hero" accepted scan image is within tolerance of 1920x1080', async () => {
    const business = makeBusiness();
    const acceptedScanImages = [makeScanImage({ width: 1920, height: 1080 })];

    const result = await resolveHeroImages({ business, acceptedScanImages });

    expect(result.heroImageUrl).toBe('/api/assets/scans/biz_1/scan_1/images/img1.jpg');
    expect(result.heroStyle).toBe('image');
    expect(mockGetDefaultHeroImage).not.toHaveBeenCalled();
  });

  it('is used within the 100px tolerance (e.g. 1850x1150)', async () => {
    const business = makeBusiness();
    const acceptedScanImages = [makeScanImage({ width: 1850, height: 1150 })];

    const result = await resolveHeroImages({ business, acceptedScanImages });

    expect(result.heroImageUrl).toBe('/api/assets/scans/biz_1/scan_1/images/img1.jpg');
  });

  it('does not match a 1600x900 image — only the specific 1920x1080 (16:9) target qualifies for this tier', async () => {
    mockStock({ desktop: STOCK_DESKTOP });
    const business = makeBusiness();
    const acceptedScanImages = [makeScanImage({ width: 1600, height: 900 })];

    const result = await resolveHeroImages({ business, acceptedScanImages });

    expect(result.heroImageUrl).toBe(STOCK_DESKTOP.image.url);
  });

  it('falls through to tier 3 when the hero-role image is outside tolerance', async () => {
    mockStock({ desktop: STOCK_DESKTOP });
    const business = makeBusiness();
    const acceptedScanImages = [makeScanImage({ width: 1200, height: 800 })];

    const result = await resolveHeroImages({ business, acceptedScanImages });

    expect(result.heroImageUrl).toBe(STOCK_DESKTOP.image.url);
  });

  it('falls through to tier 3 when no accepted image is role:"hero"', async () => {
    mockStock({ desktop: STOCK_DESKTOP });
    const business = makeBusiness();
    const acceptedScanImages = [makeScanImage({ role: 'gallery', width: 1920, height: 1080 })];

    const result = await resolveHeroImages({ business, acceptedScanImages });

    expect(result.heroImageUrl).toBe(STOCK_DESKTOP.image.url);
  });

  it('mobile reuses the same Firecrawl desktop image as a preview — a real photo beats no photo on mobile', async () => {
    const business = makeBusiness();
    const acceptedScanImages = [makeScanImage({ width: 1920, height: 1080 })];

    const result = await resolveHeroImages({ business, acceptedScanImages });

    expect(result.heroImageUrlMobile).toBe('/api/assets/scans/biz_1/scan_1/images/img1.jpg');
  });
});

describe('tier 3 — curated stock image by industry', () => {
  it('is used when no admin override and no dimension-matched Firecrawl hero exist', async () => {
    mockStock({ desktop: STOCK_DESKTOP });
    const business = makeBusiness({ industry: 'plumbing' });

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(mockGetDefaultHeroImage).toHaveBeenCalledWith('plumbing', 'desktop');
    expect(result.heroImageUrl).toBe(STOCK_DESKTOP.image.url);
    expect(result.heroStyle).toBe('image');
  });

  it('looks up the default mobile stock image independently, only once a default desktop stock image resolved', async () => {
    mockStock({ desktop: STOCK_DESKTOP, mobile: STOCK_MOBILE });
    const business = makeBusiness();

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(mockGetDefaultHeroImage).toHaveBeenCalledWith('plumbing', 'mobile');
    expect(result.heroImageUrlMobile).toBe(STOCK_MOBILE.image.url);
  });

  it('reuses the stock desktop image on mobile when the industry has no default mobile stock image', async () => {
    mockStock({ desktop: STOCK_DESKTOP, mobile: null });
    const business = makeBusiness();

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(result.heroImageUrlMobile).toBe(STOCK_DESKTOP.image.url);
  });

  it('never looks up a mobile default when no desktop default exists — falls straight to the illustration', async () => {
    mockStock({ desktop: null, mobile: STOCK_MOBILE });
    const business = makeBusiness();

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(result.heroImageUrl).toBeUndefined();
    expect(result.heroStyle).toBe('illustration');
    expect(result.heroImageUrlMobile).toBeUndefined();
    expect(mockGetDefaultHeroImage).toHaveBeenCalledWith('plumbing', 'desktop');
    expect(mockGetDefaultHeroImage).not.toHaveBeenCalledWith('plumbing', 'mobile');
  });

  it('renders imageSplit when the stock desktop image is not hero-dimensioned', async () => {
    mockStock({
      desktop: makeStockImage({ image: { ...STOCK_DESKTOP.image, width: 1200, height: 800 } }),
    });
    const business = makeBusiness();

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(result.heroStyle).toBe('imageSplit');
  });
});

describe('tier 4 — illustration fallback', () => {
  it('is used when no override, no Firecrawl match, and no stock images exist', async () => {
    const business = makeBusiness();

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(result.heroImageUrl).toBeUndefined();
    expect(result.heroStyle).toBe('illustration');
    expect(result.heroImageUrlMobile).toBeUndefined();
  });
});

describe('mobile resolution', () => {
  it('an explicit heroPhotoUrlMobile always wins over the industry\'s default mobile stock image', async () => {
    mockStock({ desktop: STOCK_DESKTOP, mobile: STOCK_MOBILE });
    const business = makeBusiness({ heroPhotoUrlMobile: '/api/assets/businesses/biz_1/assets/photos/2.jpg' });

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(result.heroImageUrlMobile).toBe('/api/assets/businesses/biz_1/assets/photos/2.jpg');
  });

  it('"none" forces no mobile photo even when a desktop photo resolved', async () => {
    mockStock({ desktop: STOCK_DESKTOP, mobile: STOCK_MOBILE });
    const business = makeBusiness({ heroPhotoUrlMobile: 'none' });

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(result.heroImageUrlMobile).toBeUndefined();
  });
});
