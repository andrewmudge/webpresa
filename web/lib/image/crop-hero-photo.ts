import 'server-only';
import sharp from 'sharp';
import { HERO_FULL_BLEED_DIMENSIONS } from './hero-dimensions';

/**
 * The desktop hero crop target — the primary full-bleed dimension
 * `checkHeroPhotoDimensions` classifies as eligible with zero tolerance
 * needed, since every image this module produces is cropped to it exactly.
 */
export const STOCK_DESKTOP_HERO_DIMENSIONS = HERO_FULL_BLEED_DIMENSIONS[0];

/**
 * Mobile hero crop target (4:5 portrait) — a product recommendation, not a
 * constraint derived from `GeneratedHero.tsx` (its mobile rendering already
 * tolerates any aspect ratio via `object-cover`). Only affects
 * internally-generated crops (stock sets, the auto-paired desktop-upload
 * crop) — never a manually-uploaded mobile photo — so it's low-risk to
 * revisit later without a migration.
 */
export const STOCK_MOBILE_HERO_DIMENSIONS = { width: 1080, height: 1350 } as const;

/**
 * Center-crops/resizes an image buffer to exactly the target dimensions,
 * re-encoding as JPEG so every crop this module produces has a single,
 * predictable content type regardless of the source format. Server-side
 * only — no interactive crop UI in Phase 1 (see build_log.md).
 */
export async function cropToDimensions(
  buffer: Buffer,
  target: { width: number; height: number },
): Promise<Buffer> {
  return sharp(buffer)
    .resize(target.width, target.height, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 90 })
    .toBuffer();
}
