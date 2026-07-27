import 'server-only';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import type { Industry } from '@/domain/constants/industries';
import type { StockImageVariant } from '@/domain/models/stock-image';
import { getS3Client, getStockImagesBucketName, getStockImagesCdnDomain } from './client';
import { fileExtension } from './business-assets';

/**
 * Object storage for the dedicated stock-images bucket — public via
 * CloudFront, never the private `assets` bucket / `/api/assets/...` proxy
 * the rest of the app uses. See `domain/models/stock-image.ts` and
 * `infra/lib/stacks/stock-images-stack.ts`.
 *
 * Every upload gets a fresh, never-reused key (a random UUID namespace) —
 * "replacing" a stock image is always a new upload plus a new `StockImage`
 * record, with the old one archived, never an overwrite at an
 * already-served key. Because every served URL is therefore permanently
 * immutable, this feature never needs a CloudFront cache invalidation.
 */

const CACHE_CONTROL_IMMUTABLE = 'public, max-age=31536000, immutable';

export async function putStockImageObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getStockImagesBucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: CACHE_CONTROL_IMMUTABLE,
    }),
  );
}

export async function deleteStockImageObject(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getStockImagesBucketName(),
      Key: key,
    }),
  );
}

export function stockImageCdnUrl(key: string): string {
  return `https://${getStockImagesCdnDomain()}/${key}`;
}

/**
 * Uploads one image file as-is — no crop, no resize — reading its actual
 * pixel dimensions via `sharp`'s header-only metadata read. Every stock
 * image upload in this module goes through this single helper so desktop
 * and mobile images are always independent, uncropped files: an admin can
 * upload only a desktop image, only a mobile image, or both, and neither
 * upload is ever derived from the other.
 */
async function uploadStockImageFile(file: File, key: string): Promise<StockImageVariant> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const { width, height } = await sharp(buffer).metadata();
  if (!width || !height) {
    throw new Error('Could not read image dimensions.');
  }

  await putStockImageObject(key, buffer, file.type || 'application/octet-stream');
  return { s3Key: key, url: stockImageCdnUrl(key), width, height };
}

/**
 * Uploads a `kind: 'hero'` StockImage's desktop image and, optionally, a
 * separate mobile image, under a fresh `hero-sets/{industry}/{setId}/`
 * namespace. `mobileFile` is genuinely optional — when omitted, this hero
 * set has no dedicated mobile image at all; the auto hero-pick's mobile
 * tier (`lib/image/resolve-hero-image.ts`) falls back to reusing the
 * desktop image on mobile in that case, rather than requiring one here.
 */
export async function uploadStockHeroSet(
  desktopFile: File,
  mobileFile: File | null,
  industry: Industry,
): Promise<{ desktop: StockImageVariant; mobile?: StockImageVariant }> {
  const setId = crypto.randomUUID();

  const [desktop, mobile] = await Promise.all([
    uploadStockImageFile(desktopFile, `hero-sets/${industry}/${setId}/desktop.${fileExtension(desktopFile)}`),
    mobileFile
      ? uploadStockImageFile(mobileFile, `hero-sets/${industry}/${setId}/mobile.${fileExtension(mobileFile)}`)
      : Promise.resolve(undefined),
  ]);

  return mobile ? { desktop, mobile } : { desktop };
}

/**
 * Uploads a standalone `kind: 'general'` stock image as-is — unused by any
 * auto-pick tier in Phase 1, exists for the Phase 2 browsable library.
 */
export async function uploadGeneralStockImage(file: File, industry?: Industry): Promise<StockImageVariant> {
  const imageId = crypto.randomUUID();
  const key = `general/${industry ?? 'uncategorized'}/${imageId}.${fileExtension(file)}`;
  return uploadStockImageFile(file, key);
}
