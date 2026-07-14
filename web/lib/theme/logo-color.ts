import 'server-only';
import sharp from 'sharp';
import type { ThemeName } from '@/domain/constants/themes';
import { getAsset } from '@/lib/s3/assets';

/**
 * Brand Theme System Step 1 — logo-based theme detection.
 *
 * Never invents a color: this module only classifies an existing logo's
 * dominant hue into the closest curated preset family (`lib/themes.ts`).
 * It never returns a raw hex value.
 */

const ASSET_PROXY_PREFIX = '/api/assets/';

/**
 * Extracts the S3 key from a business's logo URL. Business assets are
 * always stored as our own `/api/assets/{key}` proxy path (see
 * `uploadBusinessAsset` in the businesses admin actions) — anything else
 * isn't an asset we can read directly from S3.
 */
function assetKeyFromLogoUrl(logoUrl: string): string | null {
  return logoUrl.startsWith(ASSET_PROXY_PREFIX) ? logoUrl.slice(ASSET_PROXY_PREFIX.length) : null;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }

  return { h: h * 60, s, l };
}

/**
 * Maps a color's hue/saturation/lightness to the closest theme family.
 *
 * Approximate hue bands (degrees, standard color wheel), each resolved to
 * the preset it most resembles:
 *   red/burgundy 345–15 · orange 15–50 · green 50–170 · teal 170–195 ·
 *   blue/navy 195–255 · purple 255–345
 * Low-saturation colors are treated as achromatic (black → Modern Dark;
 * anything lighter has no reliable brand signal). Exported for testing.
 */
export function classifyHsl({ h, s, l }: Hsl): ThemeName | null {
  if (s < 0.12) {
    return l < 0.3 ? 'modernDark' : null;
  }
  if (h < 15 || h >= 345) return l < 0.3 ? 'warmPremium' : 'red';
  if (h < 50) return 'orange';
  if (h < 170) return 'green';
  if (h < 195) return 'modern';
  if (h < 255) return l < 0.28 ? 'premiumNavy' : 'classicBlue';
  return 'purple';
}

/**
 * Detects the dominant color of an uploaded logo and maps it to the closest
 * curated theme preset. Approximates "dominant color" as the average pixel
 * color after flattening transparency onto white and downsampling to a
 * single pixel — a standard, cheap stand-in for a full color histogram.
 *
 * Returns `null` when the logo can't be read or analyzed (asset missing,
 * corrupt image, or a color too neutral to signal a brand family) so the
 * caller can fall back to the next Brand Theme System step.
 */
export async function detectLogoThemeFamily(logoUrl: string): Promise<ThemeName | null> {
  const key = assetKeyFromLogoUrl(logoUrl);
  if (!key) return null;

  try {
    const buffer = await getAsset(key);
    if (!buffer) return null;

    const pixel = await sharp(buffer)
      .flatten({ background: '#ffffff' })
      .resize(1, 1, { fit: 'fill' })
      .raw()
      .toBuffer();

    const [r, g, b] = pixel;
    return classifyHsl(rgbToHsl(r, g, b));
  } catch (error) {
    console.error('Logo color detection failed:', error instanceof Error ? error.message : error);
    return null;
  }
}
