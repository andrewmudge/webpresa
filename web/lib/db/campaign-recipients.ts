import 'server-only';
import { GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import type { CampaignRecipient, CampaignRecipientStatus } from '@/domain/models/campaign-recipient';
import { CampaignRecipientSchema } from '@/domain/schemas/campaign-recipient.schema';
import { getDynamoDBClient, TABLE_CAMPAIGN_RECIPIENTS } from './client';
import * as rateLimit from './rate-limit';

/** DynamoDB's own per-table BatchGetItem key limit. */
const BATCH_GET_CHUNK_SIZE = 100;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getCampaignRecipientById(campaignRecipientId: string): Promise<CampaignRecipient | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_CAMPAIGN_RECIPIENTS(),
      Key: { campaignRecipientId },
    }),
  );
  if (!result.Item) return null;
  return CampaignRecipientSchema.parse(result.Item);
}

/** The redirect route's primary lookup — `/r/[campaignCode]`'s only way to resolve a scan. */
export async function getCampaignRecipientByCode(campaignCode: string): Promise<CampaignRecipient | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_CAMPAIGN_RECIPIENTS(),
      IndexName: 'campaign-code-index',
      KeyConditionExpression: 'campaignCode = :campaignCode',
      ExpressionAttributeValues: { ':campaignCode': campaignCode },
      Limit: 1,
    }),
  );
  const items = result.Items ?? [];
  if (items.length === 0) return null;
  return CampaignRecipientSchema.parse(items[0]);
}

/** Every recipient of one campaign, newest first — the admin campaign-detail recipient list. */
export async function listCampaignRecipientsForCampaign(campaignId: string): Promise<CampaignRecipient[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_CAMPAIGN_RECIPIENTS(),
      IndexName: 'campaign-id-index',
      KeyConditionExpression: 'campaignId = :campaignId',
      ExpressionAttributeValues: { ':campaignId': campaignId },
      ScanIndexForward: false,
    }),
  );
  return (result.Items ?? []).map((item) => CampaignRecipientSchema.parse(item));
}

/** Every campaign a business has ever been a recipient of, newest first. */
export async function listCampaignRecipientsForBusiness(businessId: string): Promise<CampaignRecipient[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_CAMPAIGN_RECIPIENTS(),
      IndexName: 'business-id-index',
      KeyConditionExpression: 'businessId = :businessId',
      ExpressionAttributeValues: { ':businessId': businessId },
      ScanIndexForward: false,
    }),
  );
  return (result.Items ?? []).map((item) => CampaignRecipientSchema.parse(item));
}

/**
 * Batch-gets CampaignRecipients by primary key — used by
 * `lib/analytics/dashboard.ts` (Stage 29) to resolve the recipients for a
 * set of postcards it already scanned, without a second full-table Scan.
 * Chunks at DynamoDB's 100-item BatchGetItem limit; duplicate/unprocessed
 * keys within a chunk are retried once (BatchGetItem can return
 * `UnprocessedKeys` under throttling) before giving up on any that remain,
 * matching the rest of this codebase's "best-effort, never throw on a
 * partial read" posture for analytics-adjacent reads. Order of the returned
 * array is not guaranteed to match `campaignRecipientIds`.
 */
export async function listCampaignRecipientsByIds(campaignRecipientIds: string[]): Promise<CampaignRecipient[]> {
  if (campaignRecipientIds.length === 0) return [];

  const client = getDynamoDBClient();
  const uniqueIds = Array.from(new Set(campaignRecipientIds));
  const results: CampaignRecipient[] = [];

  for (let i = 0; i < uniqueIds.length; i += BATCH_GET_CHUNK_SIZE) {
    const chunk = uniqueIds.slice(i, i + BATCH_GET_CHUNK_SIZE);
    let keys = chunk.map((campaignRecipientId) => ({ campaignRecipientId }));

    for (let attempt = 0; attempt < 2 && keys.length > 0; attempt++) {
      const result = await client.send(
        new BatchGetCommand({
          RequestItems: { [TABLE_CAMPAIGN_RECIPIENTS()]: { Keys: keys } },
        }),
      );
      for (const item of result.Responses?.[TABLE_CAMPAIGN_RECIPIENTS()] ?? []) {
        results.push(CampaignRecipientSchema.parse(item));
      }
      keys = (result.UnprocessedKeys?.[TABLE_CAMPAIGN_RECIPIENTS()]?.Keys as { campaignRecipientId: string }[] | undefined) ?? [];
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function putCampaignRecipient(recipient: CampaignRecipient): Promise<void> {
  CampaignRecipientSchema.parse(recipient);
  const client = getDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_CAMPAIGN_RECIPIENTS(),
      Item: recipient,
    }),
  );
}

/**
 * Overrides a recipient's destination with an explicit admin-supplied URL —
 * the exception path (see `domain/models/campaign-recipient.ts`,
 * `CampaignRecipientDestinationType`). Always switches `destinationType` to
 * `'custom'` and clears any `claimId` reference, since the two are mutually
 * exclusive going forward — a one-way action; there is no UI to switch a
 * recipient back to the auto-managed `'claim'` path.
 */
export async function updateCampaignRecipientDestination(
  campaignRecipientId: string,
  input: { destinationUrl: string; destinationLabel?: string },
): Promise<void> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  const hasLabel = input.destinationLabel !== undefined;
  const setClause =
    'SET destinationType = :custom, destinationUrl = :destinationUrl, updatedAt = :now' + (hasLabel ? ', destinationLabel = :destinationLabel' : '');
  const removeClause = hasLabel ? 'REMOVE claimId' : 'REMOVE claimId, destinationLabel';

  await client.send(
    new UpdateCommand({
      TableName: TABLE_CAMPAIGN_RECIPIENTS(),
      Key: { campaignRecipientId },
      UpdateExpression: `${setClause} ${removeClause}`,
      ExpressionAttributeValues: {
        ':custom': 'custom',
        ':destinationUrl': input.destinationUrl,
        ':now': now,
        ...(hasLabel ? { ':destinationLabel': input.destinationLabel } : {}),
      },
    }),
  );
}

export async function updateCampaignRecipientStatus(
  campaignRecipientId: string,
  status: CampaignRecipientStatus,
): Promise<void> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  await client.send(
    new UpdateCommand({
      TableName: TABLE_CAMPAIGN_RECIPIENTS(),
      Key: { campaignRecipientId },
      UpdateExpression: 'SET #status = :status, updatedAt = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status, ':now': now },
    }),
  );
}

/** Links a newly generated Postcard back to its CampaignRecipient (Stage 22) — the `postcardId` forward-reference Stage 21 reserved for this. */
export async function linkPostcardToCampaignRecipient(campaignRecipientId: string, postcardId: string): Promise<void> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  await client.send(
    new UpdateCommand({
      TableName: TABLE_CAMPAIGN_RECIPIENTS(),
      Key: { campaignRecipientId },
      UpdateExpression: 'SET postcardId = :postcardId, updatedAt = :now',
      ExpressionAttributeValues: { ':postcardId': postcardId, ':now': now },
    }),
  );
}

export interface RecordScanHitRollupParams {
  campaignRecipientId: string;
  /** Whether this scan's visitor-fingerprint reservation was newly created — see `lib/db/scan-hits.ts`, `reserveVisitorFingerprint`. */
  isNewUniqueVisitor: boolean;
}

/**
 * Updates a CampaignRecipient's denormalized scan rollups — called only
 * after the corresponding `ScanHit` has already been durably written (see
 * `lib/campaign/resolve-redirect.ts`). `totalScans` always increments;
 * `estimatedUniqueScans` only for a new visitor; `firstScanAt` is set only
 * if not already present. Unconditional — these are best-effort rollups,
 * never the source of truth (the `ScanHit` history is).
 */
export async function recordScanHitRollup(params: RecordScanHitRollupParams): Promise<void> {
  const { campaignRecipientId, isNewUniqueVisitor } = params;
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  await client.send(
    new UpdateCommand({
      TableName: TABLE_CAMPAIGN_RECIPIENTS(),
      Key: { campaignRecipientId },
      UpdateExpression:
        'SET totalScans = if_not_exists(totalScans, :zero) + :one, ' +
        'estimatedUniqueScans = if_not_exists(estimatedUniqueScans, :zero) + :uniqueIncr, ' +
        'lastScanAt = :now, firstScanAt = if_not_exists(firstScanAt, :now), updatedAt = :now',
      ExpressionAttributeValues: {
        ':zero': 0,
        ':one': 1,
        ':uniqueIncr': isNewUniqueVisitor ? 1 : 0,
        ':now': now,
      },
    }),
  );
}

/** Admin/cascade-delete only (business deletion, campaign deletion) — never called during normal operation. */
export async function deleteCampaignRecipientById(campaignRecipientId: string): Promise<void> {
  const client = getDynamoDBClient();
  await client.send(
    new DeleteCommand({
      TableName: TABLE_CAMPAIGN_RECIPIENTS(),
      Key: { campaignRecipientId },
    }),
  );
}

// ---------------------------------------------------------------------------
// Rate limiting — a distinct item shape in this same table (`PK =
// RATELIMIT#<ipHash>#<windowBucket>`), the `/r/[campaignCode]` redirect
// route's own abuse/cost protection — not the security boundary, the
// code's 80-bit entropy is (see implementation.md, Stage 21, "Redirect
// behavior"). Delegates to the table-agnostic `./rate-limit` helper Stage
// 20 extracted from `claims.ts`, the same as `leads.ts` already does.
// ---------------------------------------------------------------------------

export function buildRateLimitKey(ipHash: string, windowBucket: string): string {
  return rateLimit.buildRateLimitKey(ipHash, windowBucket);
}

export async function checkAndIncrementRateLimit(params: {
  bucketKey: string;
  limit: number;
  ttlEpochSeconds: number;
}): Promise<boolean> {
  return rateLimit.checkAndIncrementRateLimit({
    tableName: TABLE_CAMPAIGN_RECIPIENTS(),
    partitionKeyName: 'campaignRecipientId',
    bucketKey: params.bucketKey,
    limit: params.limit,
    ttlEpochSeconds: params.ttlEpochSeconds,
  });
}
