import 'server-only';
import sharp from 'sharp';

/**
 * Derives a square, browser-tab-ready icon from a source image (a
 * business's logo, or a customer/admin's own manual upload — both go
 * through this same transform, see `lib/s3/business-assets.ts`'s
 * `regenerateBusinessFavicon`). A single 256px PNG is sufficient — every
 * evergreen browser accepts a PNG favicon, no legacy multi-resolution
 * `.ico` encoding is needed.
 *
 * `fit: 'contain'` on a transparent canvas, never `'cover'`/crop — a wide
 * wordmark logo must never have part of its mark sliced off to force a
 * square. The tradeoff: a wide logo shrinks a lot once further downscaled
 * to actual browser-rendered favicon sizes (~16-32px), and a transparent
 * background isn't guaranteed to read well against every browser's tab
 * chrome. Good enough as a universal default — a manual override exists
 * for anyone who wants a distinct, purpose-made icon instead.
 */
export const FAVICON_SIZE = 256;

export async function generateFaviconBuffer(sourceBuffer: Buffer): Promise<Buffer> {
  return sharp(sourceBuffer)
    .resize(FAVICON_SIZE, FAVICON_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}
