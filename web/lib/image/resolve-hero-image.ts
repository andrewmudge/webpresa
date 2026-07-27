import 'server-only';
import type { Business } from '@/domain/models/business';
import type { HeroStyle } from '@/domain/models/site-preview';
import type { ScanImageAsset } from '@/domain/models/scan-image';
import { getDefaultHeroImage } from '@/lib/db/stock-images';
import { checkHeroPhotoDimensions, HERO_FULL_BLEED_DIMENSIONS, HERO_DIMENSION_TOLERANCE_PX } from './hero-dimensions';

/**
 * Automatic hero-image resolution — the auto-pick chain used whenever the
 * business hasn't explicitly overridden the hero slot. Desktop and mobile
 * are always independent images — nothing here ever crops or derives one
 * from the other, and the stock tier looks each up as a completely separate
 * query (an industry may have a default desktop hero with no default
 * mobile hero, or vice versa). Mobile only ever shows a genuinely separate
 * photo when one exists for whichever tier resolved the desktop image (an
 * explicit `heroPhotoUrlMobile` override, or the industry's own default
 * mobile stock image); otherwise, mobile simply reuses the same desktop
 * photo as a preview rather than requiring a dedicated mobile asset or
 * falling back to the illustration — a real hero photo on mobile (even if
 * not mobile-specific) is preferable to no photo at all.
 *
 * Tier order:
 *   1. Explicit admin override (`business.heroPhotoUrl`) — `'none'` forces
 *      no-photo; a set value always wins outright.
 *   2. A Firecrawl-discovered `role: 'hero'` image whose already-stored
 *      dimensions are within tolerance of 1920x1080 (16:9) — reuses the
 *      same constants `checkHeroPhotoDimensions` uses for uploaded photos,
 *      checked directly against the stored width/height (no re-fetch).
 *   3. The curated stock gallery's default desktop hero image for
 *      `business.industry` (required on every Business, so this tier only
 *      fails when no active default desktop hero exists yet for that
 *      industry).
 *   4. Theme illustration fallback (no desktop image resolved at all).
 *
 * Mobile resolution, applied after whichever of the above fired:
 *   `business.heroPhotoUrlMobile === 'none'` forces no mobile photo; a set
 *   value always wins outright; otherwise the industry's default mobile
 *   stock image is used if one exists (looked up independently of the
 *   desktop stock image — only reached when tier 3 supplied the desktop
 *   image), else the resolved desktop photo is reused; nothing is shown on
 *   mobile only when no desktop photo resolved either.
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

/** Shared by the Firecrawl and stock tiers — both work off already-known width/height, never a live fetch. */
function isWithinHeroTolerance(width?: number, height?: number): boolean {
  if (!width || !height) return false;
  const target = HERO_FULL_BLEED_DIMENSIONS[0]; // 1920x1080 — the specific 16:9 target these tiers require.
  return Math.abs(target.width - width) <= HERO_DIMENSION_TOLERANCE_PX && Math.abs(target.height - height) <= HERO_DIMENSION_TOLERANCE_PX;
}

export async function resolveHeroImages(input: ResolveHeroImagesInput): Promise<HeroImageResolution> {
  const { business, acceptedScanImages } = input;

  let heroImageUrl: string | undefined;
  let heroStyle: HeroStyle;
  /** A genuinely separate mobile image for whichever tier fires below — undefined when none exists, in which case mobile just reuses `heroImageUrl`. */
  let dedicatedMobileCandidate: string | undefined;

  if (business.heroPhotoUrl === 'none') {
    heroStyle = 'illustration';
  } else if (business.heroPhotoUrl) {
    heroImageUrl = business.heroPhotoUrl;
    const dimensionCheck = await checkHeroPhotoDimensions(heroImageUrl);
    heroStyle = dimensionCheck.isFullBleedEligible ? 'image' : 'imageSplit';
  } else {
    const firecrawlHero = acceptedScanImages.find(
      (img) => img.role === 'hero' && isWithinHeroTolerance(img.width, img.height),
    );
    if (firecrawlHero) {
      heroImageUrl = firecrawlHero.url;
      heroStyle = 'image';
    } else {
      const stockDesktop = await getDefaultHeroImage(business.industry, 'desktop');
      if (stockDesktop) {
        heroImageUrl = stockDesktop.image.url;
        heroStyle = isWithinHeroTolerance(stockDesktop.image.width, stockDesktop.image.height) ? 'image' : 'imageSplit';
        // Independent lookup — an industry may have a default mobile stock
        // image without a default desktop one, or vice versa; only queried
        // once we know a desktop stock image actually resolved.
        const stockMobile = await getDefaultHeroImage(business.industry, 'mobile');
        dedicatedMobileCandidate = stockMobile?.image.url;
      } else {
        heroStyle = 'illustration';
      }
    }
  }

  const heroImageUrlMobile =
    business.heroPhotoUrlMobile === 'none'
      ? undefined
      : (business.heroPhotoUrlMobile ?? dedicatedMobileCandidate ?? heroImageUrl);

  return { heroImageUrl, heroImageUrlMobile, heroStyle };
}
