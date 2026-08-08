import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

/**
 * Thin AWS SDK wrappers for this Lambda. Deliberately no DynamoDB client at
 * all, unlike screenshot-capture/src/aws.ts — this Lambda never reads or
 * writes any table (see infra/lib/constructs/webpresa-postcard-render-lambda.ts's
 * doc comment: the internal render page it navigates to does its own
 * server-side data lookups; this Lambda's only job is launch → render →
 * upload → return the S3 key).
 */

const s3 = new S3Client({});
const secretsManager = new SecretsManagerClient({});

export async function putPdf(bucket: string, key: string, body: Buffer): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'application/pdf',
    }),
  );
}

const secretCache = new Map<string, Record<string, string>>();

export async function getSecretJson(secretName: string): Promise<Record<string, string>> {
  const cached = secretCache.get(secretName);
  if (cached) return cached;

  const result = await secretsManager.send(new GetSecretValueCommand({ SecretId: secretName }));
  if (!result.SecretString) throw new Error(`Secret "${secretName}" has no SecretString value`);

  const parsed = JSON.parse(result.SecretString) as Record<string, string>;
  secretCache.set(secretName, parsed);
  return parsed;
}
