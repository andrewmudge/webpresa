import 'server-only';
import { S3Client } from '@aws-sdk/client-s3';

/**
 * Singleton S3 client.
 *
 * The AWS region is read from the AWS_REGION environment variable.
 * Credentials are resolved from the default SDK credential chain:
 *   - Local dev:  IAM Identity Center SSO profile (AWS_PROFILE=webpresa)
 *   - Vercel:     AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY env vars
 *                 (dedicated least-privilege IAM user — see deployment.md)
 *
 * Never expose this module or its callers to browser bundles.
 */

let client: S3Client | undefined;

export function getS3Client(): S3Client {
  if (client) return client;

  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error('AWS_REGION environment variable is not set');
  }

  // Explicitly pass static credentials when env vars are present (Vercel).
  // Falls back to the default SDK credential chain when they are absent
  // (local dev uses AWS_PROFILE / SSO session instead).
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  client = new S3Client({
    region,
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });

  return client;
}

// ---------------------------------------------------------------------------
// Bucket name helper — read from environment variable
// ---------------------------------------------------------------------------

export function getAssetsBucketName(): string {
  const name = process.env.ASSETS_BUCKET_NAME;
  if (!name) {
    throw new Error('ASSETS_BUCKET_NAME environment variable is not set');
  }
  return name;
}

/**
 * The dedicated stock-image bucket — public-via-CloudFront, distinct from
 * the private `assets` bucket above. See `lib/s3/stock-images.ts`.
 */
export function getStockImagesBucketName(): string {
  const name = process.env.STOCK_IMAGES_BUCKET_NAME;
  if (!name) {
    throw new Error('STOCK_IMAGES_BUCKET_NAME environment variable is not set');
  }
  return name;
}

/** The CloudFront distribution domain fronting the stock-images bucket, e.g. `d123abc.cloudfront.net`. */
export function getStockImagesCdnDomain(): string {
  const domain = process.env.STOCK_IMAGES_CDN_DOMAIN;
  if (!domain) {
    throw new Error('STOCK_IMAGES_CDN_DOMAIN environment variable is not set');
  }
  return domain;
}
