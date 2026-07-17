import 'server-only';
import sharp from 'sharp';
import { getAsset } from '@/lib/s3/assets';

/**
 * Desktop hero image dimension classification.
 *
 * A hero photo only renders as a full-bleed background (`heroStyle: 'image'`)
 * when it's within tolerance of one of these two sizes — anything else still
 * gets used as the hero image, but in the split (text-left, photo-right)
 * layout instead (`heroStyle: 'imageSplit'`, see `GeneratedHero.tsx`).
 */
export const HERO_FULL_BLEED_DIMENSIONS = [
  { width: 1920, height: 1080 },
  { width: 1600, height: 900 },
] as const;

/** Photos within this many pixels (either dimension) of a target size still qualify as full-bleed. */
export const HERO_DIMENSION_TOLERANCE_PX = 100;

const ASSET_PROXY_PREFIX = '/api/assets/';

/**
 * Extracts the S3 key from a business asset's proxy URL, mirroring
 * `lib/theme/logo-color.ts`'s `assetKeyFromLogoUrl` — business assets are
 * always stored as our own `/api/assets/{key}` proxy path.
 */
function assetKeyFromPhotoUrl(photoUrl: string): string | null {
  return photoUrl.startsWith(ASSET_PROXY_PREFIX) ? photoUrl.slice(ASSET_PROXY_PREFIX.length) : null;
}

export interface HeroPhotoDimensionCheck {
  isFullBleedEligible: boolean;
  width?: number;
  height?: number;
}

/**
 * Reads a hero photo's actual pixel dimensions and classifies it full-bleed
 * eligible or not. Uses `sharp`'s `metadata()` — a header-only read, not a
 * full pixel decode (unlike `detectLogoThemeFamily`'s dominant-color logic)
 * — so it's cheap enough to call on every relevant page render, not just at
 * generation time. Shared by the admin-facing warning (Photos card) and the
 * generation-time `heroStyle` decision so the two can never disagree.
 *
 * Fails safe: any unreadable/corrupt/non-proxy photo is NOT eligible, so an
 * unverifiable photo renders in the always-safe split layout.
 */
export async function checkHeroPhotoDimensions(photoUrl: string): Promise<HeroPhotoDimensionCheck> {
  const key = assetKeyFromPhotoUrl(photoUrl);
  if (!key) return { isFullBleedEligible: false };

  try {
    const buffer = await getAsset(key);
    if (!buffer) return { isFullBleedEligible: false };

    const { width, height } = await sharp(buffer).metadata();
    const isFullBleedEligible =
      !!width &&
      !!height &&
      HERO_FULL_BLEED_DIMENSIONS.some(
        (d) =>
          Math.abs(d.width - width) <= HERO_DIMENSION_TOLERANCE_PX &&
          Math.abs(d.height - height) <= HERO_DIMENSION_TOLERANCE_PX,
      );

    return { isFullBleedEligible, width, height };
  } catch (error) {
    console.error('Hero photo dimension check failed:', error instanceof Error ? error.message : error);
    return { isFullBleedEligible: false };
  }
}

/** `null` when eligible (no warning needed); a short admin-facing message otherwise. */
export function describeHeroDimensionWarning(check: HeroPhotoDimensionCheck): string | null {
  if (check.isFullBleedEligible) return null;
  const dims = check.width && check.height ? ` (currently ${check.width}×${check.height}px)` : '';
  return `This photo isn't within ${HERO_DIMENSION_TOLERANCE_PX}px of 1920×1080 or 1600×900px${dims}, so it will render in the split layout (text beside the photo) instead of a full-width background. It will still be used as your desktop hero image.`;
}

/**
 * Checks every uploaded photo's dimensions up front, keyed by URL. Used to
 * give the admin an instant warning when they change the Desktop hero image
 * selection, without needing to save and reload to see a different photo's
 * result (checking only the currently-resolved pick made every other photo
 * look "unchecked" until it was actually selected and saved).
 */
export async function describeHeroDimensionWarningsForPhotos(
  photoUrls: string[],
): Promise<Record<string, string | null>> {
  const entries = await Promise.all(
    photoUrls.map(async (url) => [url, describeHeroDimensionWarning(await checkHeroPhotoDimensions(url))] as const),
  );
  return Object.fromEntries(entries);
}
