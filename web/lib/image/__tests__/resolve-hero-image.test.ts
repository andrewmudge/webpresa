/**
 * Unit tests for the automatic hero-image tier chain: admin override →
 * Firecrawl dimension-matched hero → curated stock-by-industry → theme
 * illustration, with mobile pairing rules layered on top. `checkHeroPhotoDimensions`
 * and `getDefaultStockHeroSet` are mocked — no real image processing, S3, or
 * DynamoDB calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCheckHeroPhotoDimensions = vi.hoisted(() => vi.fn());
const mockGetDefaultStockHeroSet = vi.hoisted(() => vi.fn());

vi.mock('@/lib/image/hero-dimensions', () => ({
  checkHeroPhotoDimensions: mockCheckHeroPhotoDimensions,
  HERO_FULL_BLEED_DIMENSIONS: [
    { width: 1920, height: 1080 },
    { width: 1600, height: 900 },
  ],
  HERO_DIMENSION_TOLERANCE_PX: 100,
}));

vi.mock('@/lib/db/stock-images', () => ({
  getDefaultStockHeroSet: mockGetDefaultStockHeroSet,
}));

vi.mock('server-only', () => ({}));

import { resolveHeroImages } from '@/lib/image/resolve-hero-image';
import type { Business } from '@/domain/models/business';
import type { ScanImageAsset } from '@/domain/models/scan-image';

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

const STOCK_SET = {
  stockImageId: 'stock_00000000-0000-0000-0000-000000000001',
  kind: 'hero' as const,
  industry: 'plumbing' as const,
  desktop: { s3Key: 'hero-sets/plumbing/set1/desktop.jpg', url: 'https://cdn.example.cloudfront.net/hero-sets/plumbing/set1/desktop.jpg', width: 1920, height: 1080 },
  mobile: { s3Key: 'hero-sets/plumbing/set1/mobile.jpg', url: 'https://cdn.example.cloudfront.net/hero-sets/plumbing/set1/mobile.jpg', width: 1080, height: 1350 },
  status: 'active' as const,
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  // resetAllMocks (not clearAllMocks) — several tests below queue a
  // `mockResolvedValueOnce` that a given test deliberately never consumes
  // (e.g. the tier-1 'none' short-circuit never reaches the stock lookup at
  // all); clearAllMocks leaves that queued value pending for a later test to
  // accidentally dequeue, so a full reset is required for isolation.
  vi.resetAllMocks();
  mockGetDefaultStockHeroSet.mockResolvedValue(null);
});

describe('tier 1 — explicit admin override', () => {
  it('wins outright, checking its dimensions for heroStyle', async () => {
    mockCheckHeroPhotoDimensions.mockResolvedValueOnce({ isFullBleedEligible: true, width: 1920, height: 1080 });
    const business = makeBusiness({ heroPhotoUrl: '/api/assets/businesses/biz_1/assets/photos/0.jpg' });

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(result.heroImageUrl).toBe('/api/assets/businesses/biz_1/assets/photos/0.jpg');
    expect(result.heroStyle).toBe('image');
    expect(mockGetDefaultStockHeroSet).not.toHaveBeenCalled();
  });

  it('renders imageSplit when the overridden photo is not hero-dimensioned', async () => {
    mockCheckHeroPhotoDimensions.mockResolvedValueOnce({ isFullBleedEligible: false, width: 1200, height: 800 });
    const business = makeBusiness({ heroPhotoUrl: '/api/assets/businesses/biz_1/assets/photos/0.jpg' });

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(result.heroStyle).toBe('imageSplit');
  });

  it('"none" forces no photo, even with a qualifying Firecrawl image or stock set available', async () => {
    mockGetDefaultStockHeroSet.mockResolvedValueOnce(STOCK_SET);
    const business = makeBusiness({ heroPhotoUrl: 'none' });
    const acceptedScanImages = [makeScanImage({ width: 1920, height: 1080 })];

    const result = await resolveHeroImages({ business, acceptedScanImages });

    expect(result.heroImageUrl).toBeUndefined();
    expect(result.heroStyle).toBe('illustration');
  });

  it('pairs with heroPhotoUrlMobileAuto when set, never an independent lookup', async () => {
    mockCheckHeroPhotoDimensions.mockResolvedValueOnce({ isFullBleedEligible: true, width: 1920, height: 1080 });
    const business = makeBusiness({
      heroPhotoUrl: '/api/assets/businesses/biz_1/assets/photos/0.jpg',
      heroPhotoUrlMobileAuto: '/api/assets/businesses/biz_1/assets/photos/1.jpg',
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
    expect(mockGetDefaultStockHeroSet).not.toHaveBeenCalled();
  });

  it('is used within the 100px tolerance (e.g. 1850x1150)', async () => {
    const business = makeBusiness();
    const acceptedScanImages = [makeScanImage({ width: 1850, height: 1150 })];

    const result = await resolveHeroImages({ business, acceptedScanImages });

    expect(result.heroImageUrl).toBe('/api/assets/scans/biz_1/scan_1/images/img1.jpg');
  });

  it('does not match a 1600x900 image — only the specific 1920x1080 (16:9) target qualifies for this tier', async () => {
    mockGetDefaultStockHeroSet.mockResolvedValueOnce(STOCK_SET);
    const business = makeBusiness();
    const acceptedScanImages = [makeScanImage({ width: 1600, height: 900 })];

    const result = await resolveHeroImages({ business, acceptedScanImages });

    expect(result.heroImageUrl).toBe(STOCK_SET.desktop.url);
  });

  it('falls through to tier 3 when the hero-role image is outside tolerance', async () => {
    mockGetDefaultStockHeroSet.mockResolvedValueOnce(STOCK_SET);
    const business = makeBusiness();
    const acceptedScanImages = [makeScanImage({ width: 1200, height: 800 })];

    const result = await resolveHeroImages({ business, acceptedScanImages });

    expect(result.heroImageUrl).toBe(STOCK_SET.desktop.url);
  });

  it('falls through to tier 3 when no accepted image is role:"hero"', async () => {
    mockGetDefaultStockHeroSet.mockResolvedValueOnce(STOCK_SET);
    const business = makeBusiness();
    const acceptedScanImages = [makeScanImage({ role: 'gallery', width: 1920, height: 1080 })];

    const result = await resolveHeroImages({ business, acceptedScanImages });

    expect(result.heroImageUrl).toBe(STOCK_SET.desktop.url);
  });

  it('never sets a mobile pairing — a Firecrawl hero has no known mobile companion', async () => {
    const business = makeBusiness();
    const acceptedScanImages = [makeScanImage({ width: 1920, height: 1080 })];

    const result = await resolveHeroImages({ business, acceptedScanImages });

    expect(result.heroImageUrlMobile).toBeUndefined();
  });
});

describe('tier 3 — curated stock image by industry', () => {
  it('is used when no admin override and no dimension-matched Firecrawl hero exist', async () => {
    mockGetDefaultStockHeroSet.mockResolvedValueOnce(STOCK_SET);
    const business = makeBusiness({ industry: 'plumbing' });

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(mockGetDefaultStockHeroSet).toHaveBeenCalledWith('plumbing');
    expect(result.heroImageUrl).toBe(STOCK_SET.desktop.url);
    expect(result.heroStyle).toBe('image');
  });

  it('pairs the stock set\'s own mobile variant as the mobile candidate', async () => {
    mockGetDefaultStockHeroSet.mockResolvedValueOnce(STOCK_SET);
    const business = makeBusiness();

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(result.heroImageUrlMobile).toBe(STOCK_SET.mobile.url);
  });
});

describe('tier 4 — illustration fallback', () => {
  it('is used when no override, no Firecrawl match, and no stock set exist', async () => {
    const business = makeBusiness();

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(result.heroImageUrl).toBeUndefined();
    expect(result.heroStyle).toBe('illustration');
    expect(result.heroImageUrlMobile).toBeUndefined();
  });
});

describe('mobile resolution', () => {
  it('an explicit heroPhotoUrlMobile always wins over any paired candidate', async () => {
    mockGetDefaultStockHeroSet.mockResolvedValueOnce(STOCK_SET);
    const business = makeBusiness({ heroPhotoUrlMobile: '/api/assets/businesses/biz_1/assets/photos/2.jpg' });

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(result.heroImageUrlMobile).toBe('/api/assets/businesses/biz_1/assets/photos/2.jpg');
  });

  it('"none" forces no mobile photo even when a paired candidate exists', async () => {
    mockGetDefaultStockHeroSet.mockResolvedValueOnce(STOCK_SET);
    const business = makeBusiness({ heroPhotoUrlMobile: 'none' });

    const result = await resolveHeroImages({ business, acceptedScanImages: [] });

    expect(result.heroImageUrlMobile).toBeUndefined();
  });
});
