import 'server-only';
import { SQSClient } from '@aws-sdk/client-sqs';

/**
 * Singleton SQS client — Stage 24 only, used exclusively for a read-only
 * depth check on the screenshot Lambda's dead-letter queue (see
 * `lib/sqs/dlq.ts`). Same region/credential pattern as every other AWS
 * client in this codebase (`lib/db/client.ts`, `lib/lambda/client.ts`).
 */

let client: SQSClient | undefined;

export function getSqsClient(): SQSClient {
  if (client) return client;

  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error('AWS_REGION environment variable is not set');
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  client = new SQSClient({
    region,
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });

  return client;
}
