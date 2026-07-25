import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { getInternalApiSecret } from '@/lib/secrets';

/**
 * Stage 16 — verifies that a request to `/api/internal/scan/*` actually came
 * from the Step Functions state machine's EventBridge Connection, not an
 * arbitrary caller. The connection is configured with API_KEY auth sending
 * this same header name/value (see `infra/lib/stacks/scan-workflow-stack.ts`),
 * sourced from the same `internal-api` secret this reads — both sides share
 * one value, so there's nothing to keep in sync by hand.
 *
 * There is no existing service-to-service auth convention in this repo to
 * follow (the screenshot Lambda talks to DynamoDB/S3 directly with its own
 * IAM role, never over HTTP into this app) — this is the first one.
 */

export const INTERNAL_API_SECRET_HEADER = 'x-webpresa-internal-secret';

function safeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export async function verifyInternalRequest(request: Request): Promise<boolean> {
  const provided = request.headers.get(INTERNAL_API_SECRET_HEADER);
  if (!provided) return false;

  const { sharedSecret } = await getInternalApiSecret();
  return safeEquals(provided, sharedSecret);
}
