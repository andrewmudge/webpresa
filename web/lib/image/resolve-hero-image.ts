import 'server-only';
import type { Business } from '@/domain/models/business';
import type { HeroStyle } from '@/domain/models/site-preview';
import type { ScanImageAsset } from '@/domain/models/scan-image';
import { getDefaultStockHeroSet } from '@/lib/db/stock-images';
import { checkHeroPhotoDimensions, HERO_FULL_BLEED_DIMENSIONS, HERO_DIMENSION_TOLERANCE_PX } from './hero-dimensions';

/**
 * Automatic hero-image resolution — the new (see build_log.md) auto-pick
 * chain used whenever the business hasn't explicitly overridden the hero
 * slot. Desktop is resolved first; mobile then pairs with whichever tier
 * supplied the desktop image (never an independent industry lookup), so
 * the two images always look like they belong together.
 *
 * Tier order:
 *   1. Explicit admin override (`business.heroPhotoUrl`) — `'none'` forces
 *      no-photo; a set value always wins outright. Mobile pairing candidate
 *      for this tier is `heroPhotoUrlMobileAuto` (the auto-crop paired with
 *      a custom hero upload — see `updatePhotosAction`).
 *   2. A Firecrawl-discovered `role: 'hero'` image whose already-stored
 *      dimensions are within tolerance of 1920x1080 (16:9) — reuses the
 *      same constants `checkHeroPhotoDimensions` uses for uploaded photos,
 *      but checked directly against the stored width/height (no re-fetch).
 *      No mobile pairing — a Firecrawl hero has no known mobile companion,
 *      so mobile falls through to the illustration unless manually set.
 *   3. A curated stock hero set matching `business.industry` (required on
 *      every Business, so this tier only fails when no active stock set
 *      exists yet for that industry). Mobile pairing candidate is the
 *      stock set's own mobile variant.
 *   4. Theme illustration fallback (no desktop image resolved at all).
 *
 * Mobile resolution, applied after whichever of the above fired:
 *   `business.heroPhotoUrlMobile === 'none'` forces no mobile photo; a set
 *   value always wins outright; otherwise the paired candidate from
 *   whichever desktop tier fired is used (undefined for tier 2).
 */

export interface ResolveHeroImagesInput {
  business: Business;
  /** Pre-filtered to `status: 'accepted'` entries with a resolved `url` — see `generatePreviewContent`. */
  acceptedScanImages: ScanImageAsset[];
}

export interface HeroImageResolution {
  heroImageUrl?: string;
  heroImageUrlMobile?: string;
  heroStyle: HeroStyle;
}

function isFirecrawlHeroDimensionMatch(width?: number, height?: number): boolean {
  if (!width || !height) return false;
  const target = HERO_FULL_BLEED_DIMENSIONS[0]; // 1920x1080 — the specific 16:9 target this tier requires.
  return Math.abs(target.width - width) <= HERO_DIMENSION_TOLERANCE_PX && Math.abs(target.height - height) <= HERO_DIMENSION_TOLERANCE_PX;
}

export async function resolveHeroImages(input: ResolveHeroImagesInput): Promise<HeroImageResolution> {
  const { business, acceptedScanImages } = input;

  let heroImageUrl: string | undefined;
  let heroStyle: HeroStyle;
  let mobilePairingCandidate: string | undefined;

  if (business.heroPhotoUrl === 'none') {
    heroStyle = 'illustration';
  } else if (business.heroPhotoUrl) {
    heroImageUrl = business.heroPhotoUrl;
    const dimensionCheck = await checkHeroPhotoDimensions(heroImageUrl);
    heroStyle = dimensionCheck.isFullBleedEligible ? 'image' : 'imageSplit';
    mobilePairingCandidate = business.heroPhotoUrlMobileAuto;
  } else {
    const firecrawlHero = acceptedScanImages.find(
      (img) => img.role === 'hero' && isFirecrawlHeroDimensionMatch(img.width, img.height),
    );
    if (firecrawlHero) {
      heroImageUrl = firecrawlHero.url;
      heroStyle = 'image';
    } else {
      const stockSet = await getDefaultStockHeroSet(business.industry);
      if (stockSet) {
        heroImageUrl = stockSet.desktop.url;
        heroStyle = 'image';
        mobilePairingCandidate = stockSet.mobile?.url;
      } else {
        heroStyle = 'illustration';
      }
    }
  }

  const heroImageUrlMobile =
    business.heroPhotoUrlMobile === 'none' ? undefined : (business.heroPhotoUrlMobile ?? mobilePairingCandidate);

  return { heroImageUrl, heroImageUrlMobile, heroStyle };
}
