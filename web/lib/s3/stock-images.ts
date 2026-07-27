import 'server-only';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import type { Industry } from '@/domain/constants/industries';
import type { StockImageVariant } from '@/domain/models/stock-image';
import { getS3Client, getStockImagesBucketName, getStockImagesCdnDomain } from './client';
import { fileExtension } from './business-assets';
import { cropToDimensions, STOCK_DESKTOP_HERO_DIMENSIONS, STOCK_MOBILE_HERO_DIMENSIONS } from '@/lib/image/crop-hero-photo';

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
 * Crops a source upload into the desktop (1920x1080) + mobile (1080x1350)
 * hero pair and uploads both under a fresh `hero-sets/{industry}/{setId}/`
 * namespace. Used by both the admin Stock Images upload form (a `kind:
 * 'hero'` StockImage) and `updatePhotosAction`'s desktop-hero-upload
 * auto-crop (a business's own custom hero + its auto-paired mobile crop).
 */
export async function uploadStockHeroSet(
  file: File,
  namespace: string,
): Promise<{ desktop: StockImageVariant; mobile: StockImageVariant }> {
  const source = Buffer.from(await file.arrayBuffer());
  const setId = crypto.randomUUID();

  const [desktopBuffer, mobileBuffer] = await Promise.all([
    cropToDimensions(source, STOCK_DESKTOP_HERO_DIMENSIONS),
    cropToDimensions(source, STOCK_MOBILE_HERO_DIMENSIONS),
  ]);

  const desktopKey = `hero-sets/${namespace}/${setId}/desktop.jpg`;
  const mobileKey = `hero-sets/${namespace}/${setId}/mobile.jpg`;

  await Promise.all([
    putStockImageObject(desktopKey, desktopBuffer, 'image/jpeg'),
    putStockImageObject(mobileKey, mobileBuffer, 'image/jpeg'),
  ]);

  return {
    desktop: {
      s3Key: desktopKey,
      url: stockImageCdnUrl(desktopKey),
      ...STOCK_DESKTOP_HERO_DIMENSIONS,
    },
    mobile: {
      s3Key: mobileKey,
      url: stockImageCdnUrl(mobileKey),
      ...STOCK_MOBILE_HERO_DIMENSIONS,
    },
  };
}

/**
 * Uploads a standalone `kind: 'general'` stock image as-is (no crop —
 * unused by any auto-pick tier in Phase 1, exists for the Phase 2 browsable
 * library).
 */
export async function uploadGeneralStockImage(file: File, industry?: Industry): Promise<StockImageVariant> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const { width, height } = await sharp(buffer).metadata();
  if (!width || !height) {
    throw new Error('Could not read image dimensions.');
  }

  const imageId = crypto.randomUUID();
  const key = `general/${industry ?? 'uncategorized'}/${imageId}.${fileExtension(file)}`;
  await putStockImageObject(key, buffer, file.type || 'application/octet-stream');

  return { s3Key: key, url: stockImageCdnUrl(key), width, height };
}
