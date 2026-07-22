import 'server-only';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getAssetsBucketName, getS3Client } from './client';

/**
 * Generic private-object-storage helpers for the Webpresa assets bucket.
 *
 * Bucket layout (single bucket, prefix-scoped — see architecture.md):
 *   scans/{businessId}/{scanId}/...
 *   previews/{businessId}/{previewId}/...
 *   postcards/{businessId}/{postcardId}/...
 *   businesses/{businessId}/assets/...
 *
 * These helpers are intentionally generic — domain-specific helpers
 * (e.g. uploading a scan screenshot) belong to the stages that produce
 * that data (Stages 13, 14, 22), not here.
 */

const ALLOWED_PREFIXES = ['scans/', 'previews/', 'postcards/', 'businesses/'];

function assertAllowedKey(key: string): void {
  if (!ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    throw new Error(
      `Invalid asset key "${key}" — must start with one of: ${ALLOWED_PREFIXES.join(', ')}`,
    );
  }
}

export async function putAsset(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  assertAllowedKey(key);
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getAssetsBucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteAsset(key: string): Promise<void> {
  assertAllowedKey(key);
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getAssetsBucketName(),
      Key: key,
    }),
  );
}

export async function getAsset(key: string): Promise<Buffer | null> {
  assertAllowedKey(key);
  const client = getS3Client();
  try {
    const result = await client.send(
      new GetObjectCommand({
        Bucket: getAssetsBucketName(),
        Key: key,
      }),
    );
    if (!result.Body) return null;
    const bytes = await result.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch (error) {
    if (error instanceof NoSuchKey) return null;
    throw error;
  }
}

/**
 * Returns a short-lived signed URL for private admin viewing.
 * Defaults to a 5-minute expiry.
 */
export async function getSignedAssetUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  assertAllowedKey(key);
  const client = getS3Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: getAssetsBucketName(),
      Key: key,
    }),
    { expiresIn: expiresInSeconds },
  );
}
