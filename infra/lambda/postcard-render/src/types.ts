/**
 * Stage 22 Phase 2 render payload and result — the whole contract between
 * this Lambda and its caller (`web/lib/postcards/render.ts`).
 *
 * Unlike screenshot-capture's identifiers-only `CapturePayload` (which
 * re-reads everything from DynamoDB, since that Lambda is invoked
 * fire-and-forget with no return value the caller ever sees), this Lambda
 * has no DynamoDB access at all (see aws.ts) and is invoked synchronously
 * (`InvocationType: 'RequestResponse'`) — so `businessId` travels in the
 * payload (needed only to build the S3 storage key), and the result comes
 * straight back as the Lambda's own return value rather than a table write.
 */

export type PostcardSide = 'front' | 'back';

export interface RenderPayload {
  postcardId: string;
  businessId: string;
  side: PostcardSide;
}

export interface RenderResult {
  storageKey: string;
}
