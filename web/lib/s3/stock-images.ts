import 'server-only';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import type { StockImageAsset } from '@/domain/models/stock-image';
import { getS3Client, getStockImagesBucketName, getStockImagesCdnDomain } from './client';
import { fileExtension } from './business-assets';

/**
 * Object storage for the dedicated stock-images bucket — public via
 * CloudFront, never the private `assets` bucket / `/api/assets/...` proxy
 * the rest of the app uses. See `domain/models/stock-image.ts` and
 * `infra/lib/stacks/stock-images-stack.ts`.
 *
 * Every upload gets a fresh, never-reused key (a random UUID) —
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
 * Uploads one image file as-is under `keyPrefix` — no crop, no resize —
 * reading its actual pixel dimensions via `sharp`'s header-only metadata
 * read. The only upload path in this module: every StockImage is exactly
 * one independently-uploaded image, so there is nothing else to derive.
 */
export async function uploadStockImage(file: File, keyPrefix: string): Promise<StockImageAsset> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const { width, height } = await sharp(buffer).metadata();
  if (!width || !height) {
    throw new Error('Could not read image dimensions.');
  }

  const key = `${keyPrefix}.${fileExtension(file)}`;
  await putStockImageObject(key, buffer, file.type || 'application/octet-stream');
  return { s3Key: key, url: stockImageCdnUrl(key), width, height };
}
