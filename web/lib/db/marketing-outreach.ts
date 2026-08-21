import 'server-only';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { MarketingOutreach } from '@/domain/models/marketing-outreach';
import type { EmailSequence } from '@/domain/models/email-template';
import { MarketingOutreachSchema } from '@/domain/schemas/marketing-outreach.schema';
import { getDynamoDBClient, TABLE_MARKETING_OUTREACH } from './client';

const LIST_SAFETY_CAP_PAGES = 40;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getMarketingOutreach(businessId: string, marketingCampaignId: string): Promise<MarketingOutreach | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_MARKETING_OUTREACH(),
      Key: { businessId, marketingCampaignId },
    }),
  );
  if (!result.Item) return null;
  return MarketingOutreachSchema.parse(result.Item);
}

/**
 * The daily cron sweep's sole query — every enrollment whose next scheduled
 * step is due, via the sparse `campaign-next-action-index` (only `'active'`
 * rows with a pending step set `nextActionAt` at all). Bounded pagination,
 * same safety-cap convention as `listAllPostcards`.
 */
export async function listDueOutreach(marketingCampaignId: string, nowIso: string): Promise<MarketingOutreach[]> {
  const client = getDynamoDBClient();
  const items: MarketingOutreach[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  let pages = 0;

  do {
    const result = await client.send(
      new QueryCommand({
        TableName: TABLE_MARKETING_OUTREACH(),
        IndexName: 'campaign-next-action-index',
        KeyConditionExpression: 'marketingCampaignId = :marketingCampaignId AND nextActionAt <= :now',
        ExpressionAttributeValues: { ':marketingCampaignId': marketingCampaignId, ':now': nowIso },
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const item of result.Items ?? []) {
      items.push(MarketingOutreachSchema.parse(item));
    }
    exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    pages += 1;
  } while (exclusiveStartKey && pages < LIST_SAFETY_CAP_PAGES);

  return items;
}

/** Every enrollment in one campaign regardless of state, newest first — the admin dashboard's list/filter query. */
export async function listOutreachForCampaign(marketingCampaignId: string): Promise<MarketingOutreach[]> {
  const client = getDynamoDBClient();
  const items: MarketingOutreach[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  let pages = 0;

  do {
    const result = await client.send(
      new QueryCommand({
        TableName: TABLE_MARKETING_OUTREACH(),
        IndexName: 'campaign-id-index',
        KeyConditionExpression: 'marketingCampaignId = :marketingCampaignId',
        ExpressionAttributeValues: { ':marketingCampaignId': marketingCampaignId },
        ScanIndexForward: false,
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const item of result.Items ?? []) {
      items.push(MarketingOutreachSchema.parse(item));
    }
    exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    pages += 1;
  } while (exclusiveStartKey && pages < LIST_SAFETY_CAP_PAGES);

  return items;
}

/** The public unsubscribe route's sole lookup. */
export async function getOutreachByUnsubscribeToken(unsubscribeToken: string): Promise<MarketingOutreach | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_MARKETING_OUTREACH(),
      IndexName: 'unsubscribe-token-index',
      KeyConditionExpression: 'unsubscribeToken = :unsubscribeToken',
      ExpressionAttributeValues: { ':unsubscribeToken': unsubscribeToken },
      Limit: 1,
    }),
  );
  const items = result.Items ?? [];
  if (items.length === 0) return null;
  return MarketingOutreachSchema.parse(items[0]);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Enroll-once guard — the composite key (`businessId`+`marketingCampaignId`) itself is the uniqueness boundary. Returns `false` (never throws) if this business is already enrolled in this campaign. */
export async function putMarketingOutreachIfNotExists(outreach: MarketingOutreach): Promise<boolean> {
  MarketingOutreachSchema.parse(outreach);
  const client = getDynamoDBClient();
  try {
    await client.send(
      new PutCommand({
        TableName: TABLE_MARKETING_OUTREACH(),
        Item: outreach,
        ConditionExpression: 'attribute_not_exists(marketingCampaignId)',
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

export interface RecordOutreachSendSucceededParams {
  businessId: string;
  marketingCampaignId: string;
  sentSequence: EmailSequence;
  /** Absent when `sentSequence` was the last step (3) — the outreach completes instead. */
  next?: { nextActionSequence: EmailSequence; nextActionAt: string };
}

/** Advances an outreach after a real send — resets the per-step retry counter, and either schedules the following step or marks the outreach `'completed'`. */
export async function recordOutreachSendSucceeded(params: RecordOutreachSendSucceededParams): Promise<void> {
  const { businessId, marketingCampaignId, sentSequence, next } = params;
  const client = getDynamoDBClient();
  const now = new Date().toISOString();

  if (next) {
    await client.send(
      new UpdateCommand({
        TableName: TABLE_MARKETING_OUTREACH(),
        Key: { businessId, marketingCampaignId },
        UpdateExpression:
          'SET currentSequence = :sentSequence, nextActionSequence = :nextActionSequence, nextActionAt = :nextActionAt, ' +
          'sendAttemptCount = :zero, lastEventAt = :now, lastEventType = :eventType, updatedAt = :now',
        ExpressionAttributeValues: {
          ':sentSequence': sentSequence,
          ':nextActionSequence': next.nextActionSequence,
          ':nextActionAt': next.nextActionAt,
          ':zero': 0,
          ':now': now,
          ':eventType': `email_${sentSequence}_sent`,
        },
      }),
    );
    return;
  }

  await client.send(
    new UpdateCommand({
      TableName: TABLE_MARKETING_OUTREACH(),
      Key: { businessId, marketingCampaignId },
      UpdateExpression:
        'SET currentSequence = :sentSequence, #status = :completed, sendAttemptCount = :zero, ' +
        'lastEventAt = :now, lastEventType = :eventType, updatedAt = :now REMOVE nextActionAt, nextActionSequence',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':sentSequence': sentSequence, ':completed': 'completed', ':zero': 0, ':now': now, ':eventType': `email_${sentSequence}_sent` },
    }),
  );
}

export interface RecordOutreachSendFailedParams {
  businessId: string;
  marketingCampaignId: string;
  /** Present while under the retry limit — reschedules the same step. Absent once the limit is reached — the outreach gives up (`status: 'failed'`). */
  retryAt?: string;
}

export async function recordOutreachSendFailed(params: RecordOutreachSendFailedParams): Promise<void> {
  const { businessId, marketingCampaignId, retryAt } = params;
  const client = getDynamoDBClient();
  const now = new Date().toISOString();

  if (retryAt) {
    await client.send(
      new UpdateCommand({
        TableName: TABLE_MARKETING_OUTREACH(),
        Key: { businessId, marketingCampaignId },
        UpdateExpression: 'SET nextActionAt = :retryAt, sendAttemptCount = if_not_exists(sendAttemptCount, :zero) + :one, updatedAt = :now',
        ExpressionAttributeValues: { ':retryAt': retryAt, ':zero': 0, ':one': 1, ':now': now },
      }),
    );
    return;
  }

  await client.send(
    new UpdateCommand({
      TableName: TABLE_MARKETING_OUTREACH(),
      Key: { businessId, marketingCampaignId },
      UpdateExpression:
        'SET #status = :failed, sendAttemptCount = if_not_exists(sendAttemptCount, :zero) + :one, updatedAt = :now REMOVE nextActionAt',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':failed': 'failed', ':zero': 0, ':one': 1, ':now': now },
    }),
  );
}

export interface TransitionOutreachToTerminalParams {
  businessId: string;
  marketingCampaignId: string;
  status: 'suppressed' | 'completed';
  suppressionReason?: string;
  lastEventType?: string;
}

/** Ends an outreach for a reason other than a successful/failed send — claimed, became a customer, engaged with the postcard, or hit `MarketingSuppression` (unsubscribed/bounced/complained/admin). Unconditional: called from several independent triggers (send-time eligibility check, SES webhook, unsubscribe route), all of which are safe to apply more than once. */
export async function transitionOutreachToTerminal(params: TransitionOutreachToTerminalParams): Promise<void> {
  const { businessId, marketingCampaignId, status, suppressionReason, lastEventType } = params;
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  const values: Record<string, unknown> = { ':status': status, ':now': now };
  const setClauses = ['#status = :status', 'updatedAt = :now'];

  if (suppressionReason !== undefined) {
    values[':suppressionReason'] = suppressionReason;
    setClauses.push('suppressionReason = :suppressionReason');
  }
  if (lastEventType !== undefined) {
    values[':lastEventType'] = lastEventType;
    values[':lastEventAt'] = now;
    setClauses.push('lastEventType = :lastEventType', 'lastEventAt = :lastEventAt');
  }

  await client.send(
    new UpdateCommand({
      TableName: TABLE_MARKETING_OUTREACH(),
      Key: { businessId, marketingCampaignId },
      UpdateExpression: `SET ${setClauses.join(', ')} REMOVE nextActionAt, nextActionSequence`,
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: values,
    }),
  );
}

// ---------------------------------------------------------------------------
// Manual admin controls — each a conditional transition, `false` (never
// throws) if the outreach isn't in the expected starting state, so the
// admin UI can surface "this changed since you loaded the page" instead of
// a generic error.
// ---------------------------------------------------------------------------

export async function pauseOutreach(businessId: string, marketingCampaignId: string, pauseReason?: string): Promise<boolean> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  try {
    await client.send(
      new UpdateCommand({
        TableName: TABLE_MARKETING_OUTREACH(),
        Key: { businessId, marketingCampaignId },
        ConditionExpression: '#status = :active',
        UpdateExpression: `SET #status = :paused, updatedAt = :now${pauseReason !== undefined ? ', pauseReason = :pauseReason' : ''} REMOVE nextActionAt`,
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':active': 'active', ':paused': 'paused', ':now': now, ...(pauseReason !== undefined ? { ':pauseReason': pauseReason } : {}) },
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

/** Resumes at "eligible immediately" — the next cron pass re-checks eligibility fresh, same as any other send. */
export async function resumeOutreach(businessId: string, marketingCampaignId: string): Promise<boolean> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  try {
    await client.send(
      new UpdateCommand({
        TableName: TABLE_MARKETING_OUTREACH(),
        Key: { businessId, marketingCampaignId },
        ConditionExpression: '#status = :paused',
        UpdateExpression: 'SET #status = :active, nextActionAt = :now, updatedAt = :now REMOVE pauseReason',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':paused': 'paused', ':active': 'active', ':now': now },
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

export async function suppressOutreachManually(businessId: string, marketingCampaignId: string): Promise<boolean> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  try {
    await client.send(
      new UpdateCommand({
        TableName: TABLE_MARKETING_OUTREACH(),
        Key: { businessId, marketingCampaignId },
        ConditionExpression: '#status = :active OR #status = :paused',
        UpdateExpression: 'SET #status = :suppressed, suppressionReason = :reason, updatedAt = :now REMOVE nextActionAt, nextActionSequence, pauseReason',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':active': 'active', ':paused': 'paused', ':suppressed': 'suppressed', ':reason': 'admin', ':now': now },
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

export async function cancelRemainingOutreach(businessId: string, marketingCampaignId: string): Promise<boolean> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  try {
    await client.send(
      new UpdateCommand({
        TableName: TABLE_MARKETING_OUTREACH(),
        Key: { businessId, marketingCampaignId },
        ConditionExpression: '#status = :active OR #status = :paused',
        UpdateExpression: 'SET #status = :cancelled, updatedAt = :now REMOVE nextActionAt, nextActionSequence, pauseReason',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':active': 'active', ':paused': 'paused', ':cancelled': 'cancelled', ':now': now },
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}
