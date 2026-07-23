import 'server-only';
import { LambdaClient } from '@aws-sdk/client-lambda';

/**
 * Singleton Lambda client — Stage 14 only, used exclusively to asynchronously
 * invoke the screenshot-capture Lambda (see `lib/screenshots/capture.ts`).
 * Same region/credential pattern as every other AWS client in this codebase
 * (`lib/db/client.ts`, `lib/s3/client.ts`, `lib/secrets/client.ts`).
 *
 * The `webpresa-vercel-dev` IAM identity is granted exactly one permission
 * for this client's target — `lambda:InvokeFunction` scoped to the
 * screenshot Lambda's own ARN — nothing broader (see `implementation.md`,
 * Stage 14, "Infrastructure and IAM").
 */

let client: LambdaClient | undefined;

export function getLambdaClient(): LambdaClient {
  if (client) return client;

  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error('AWS_REGION environment variable is not set');
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  client = new LambdaClient({
    region,
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });

  return client;
}

export function getScreenshotLambdaFunctionName(): string {
  const name = process.env.SCREENSHOT_LAMBDA_FUNCTION_NAME;
  if (!name) {
    throw new Error('SCREENSHOT_LAMBDA_FUNCTION_NAME environment variable is not set');
  }
  return name;
}
