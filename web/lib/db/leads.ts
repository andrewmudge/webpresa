import 'server-only';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { Lead, LeadStatus, LeadNotificationStatus } from '@/domain/models/lead';
import { LeadSchema } from '@/domain/schemas/lead.schema';
import { getDynamoDBClient, TABLE_LEADS } from './client';
import * as rateLimit from './rate-limit';

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getLeadById(leadId: string): Promise<Lead | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_LEADS(),
      Key: { leadId },
    }),
  );
  if (!result.Item) return null;
  return LeadSchema.parse(result.Item);
}

/** Every lead for one business, newest first — the customer inbox and admin troubleshooting view. */
export async function listLeadsForBusiness(businessId: string): Promise<Lead[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_LEADS(),
      IndexName: 'business-id-index',
      KeyConditionExpression: 'businessId = :businessId',
      ExpressionAttributeValues: { ':businessId': businessId },
      ScanIndexForward: false,
    }),
  );
  return (result.Items ?? []).map((item) => LeadSchema.parse(item));
}

const RETRY_SCAN_SAFETY_CAP_PAGES = 40;

/**
 * Leads still `pending`/`failed` with attempts remaining — the Vercel Cron
 * retry sweep's candidate set (`lib/leads/notify.ts`). A full `ScanCommand`
 * with a bounded page cap, matching `listAllScans`' documented dev-scale
 * tradeoff (`lib/db/scan-events.ts`) — no GSI supports this cross-business
 * query, and this table's real per-business query pattern is already
 * covered by `business-id-index`. `attribute_exists(businessId)` in the
 * filter is what keeps this scan from ever returning the rate-limit-counter
 * or fingerprint-reservation item shapes this same table also carries —
 * neither ever populates `businessId`.
 */
export async function listLeadsNeedingNotificationRetry(maxAttempts: number): Promise<Lead[]> {
  const client = getDynamoDBClient();
  const items: Lead[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  let pages = 0;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: TABLE_LEADS(),
        Limit: 200,
        FilterExpression:
          'attribute_exists(businessId) AND (notificationStatus = :pending OR notificationStatus = :failed) AND notificationAttempts < :maxAttempts',
        ExpressionAttributeValues: {
          ':pending': 'pending',
          ':failed': 'failed',
          ':maxAttempts': maxAttempts,
        },
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const item of result.Items ?? []) {
      items.push(LeadSchema.parse(item));
    }
    exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    pages += 1;
  } while (exclusiveStartKey && pages < RETRY_SCAN_SAFETY_CAP_PAGES);

  return items;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function putLead(lead: Lead): Promise<void> {
  LeadSchema.parse(lead);
  const client = getDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_LEADS(),
      Item: lead,
    }),
  );
}

/** Owner inbox triage — mark read or archived. Never customer-deletable, only archivable. */
export async function updateLeadStatus(leadId: string, status: LeadStatus): Promise<void> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  await client.send(
    new UpdateCommand({
      TableName: TABLE_LEADS(),
      Key: { leadId },
      UpdateExpression: 'SET #status = :status, updatedAt = :now' + (status === 'archived' ? ', archivedAt = :now' : ''),
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status, ':now': now },
    }),
  );
}

export interface NotificationOutcome {
  status: LeadNotificationStatus;
  error?: string;
}

/** Records the outcome of an SES send attempt — called by both the initial submission and the cron/admin retry paths (`lib/leads/notify.ts`). */
export async function updateLeadNotificationOutcome(leadId: string, outcome: NotificationOutcome): Promise<void> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  await client.send(
    new UpdateCommand({
      TableName: TABLE_LEADS(),
      Key: { leadId },
      UpdateExpression:
        'SET notificationStatus = :status, notificationAttempts = if_not_exists(notificationAttempts, :zero) + :one, ' +
        'lastNotificationAttemptAt = :now, updatedAt = :now' +
        (outcome.error ? ', lastNotificationError = :error' : ' REMOVE lastNotificationError'),
      ExpressionAttributeValues: {
        ':status': outcome.status,
        ':zero': 0,
        ':one': 1,
        ':now': now,
        ...(outcome.error ? { ':error': outcome.error } : {}),
      },
    }),
  );
}

/** Admin/cascade-delete only — never exposed to a customer action. */
export async function deleteLeadById(leadId: string): Promise<void> {
  const client = getDynamoDBClient();
  await client.send(
    new DeleteCommand({
      TableName: TABLE_LEADS(),
      Key: { leadId },
    }),
  );
}

// ---------------------------------------------------------------------------
// Rate limiting — a distinct item shape in this same table (see
// `infra/lib/stacks/data-stack.ts`'s Leads table comment), delegating the
// actual DynamoDB call to the table-agnostic `./rate-limit` helper Stage 20
// extracted from `claims.ts` rather than duplicating it.
// ---------------------------------------------------------------------------

export function buildLeadRateLimitKey(scope: string, windowBucket: string): string {
  return rateLimit.buildRateLimitKey(scope, windowBucket);
}

export async function checkAndIncrementLeadRateLimit(params: {
  bucketKey: string;
  limit: number;
  ttlEpochSeconds: number;
}): Promise<boolean> {
  return rateLimit.checkAndIncrementRateLimit({
    tableName: TABLE_LEADS(),
    partitionKeyName: 'leadId',
    bucketKey: params.bucketKey,
    limit: params.limit,
    ttlEpochSeconds: params.ttlEpochSeconds,
  });
}

// ---------------------------------------------------------------------------
// Duplicate-submission suppression — a third item shape in this same table.
// Atomic reservation via a conditional PutItem, the same pattern
// `domain-connections` uses for `normalizedDomain` uniqueness, never a
// GSI-query-then-write (which can't be atomic across two operations).
// ---------------------------------------------------------------------------

/**
 * Atomically reserves a duplicate-submission fingerprint. Returns `false`
 * (never throws) when the fingerprint was already reserved within its
 * window — the caller treats this identically to any other suppressed
 * submission: a generic success response, no second Lead written.
 */
export async function reserveLeadFingerprint(fingerprint: string, ttlEpochSeconds: number): Promise<boolean> {
  const client = getDynamoDBClient();
  try {
    await client.send(
      new PutCommand({
        TableName: TABLE_LEADS(),
        Item: { leadId: `FINGERPRINT#${fingerprint}`, ttl: ttlEpochSeconds },
        ConditionExpression: 'attribute_not_exists(leadId)',
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}
