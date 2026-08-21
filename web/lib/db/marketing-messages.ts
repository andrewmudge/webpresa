import 'server-only';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { MarketingMessage, MarketingSesEventStatus } from '@/domain/models/marketing-message';
import { MarketingMessageSchema } from '@/domain/schemas/marketing-message.schema';
import { getDynamoDBClient, TABLE_MARKETING_MESSAGES } from './client';

const LIST_SAFETY_CAP_PAGES = 40;

export async function getMarketingMessage(businessId: string, sortKey: string): Promise<MarketingMessage | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_MARKETING_MESSAGES(),
      Key: { businessId, sortKey },
    }),
  );
  if (!result.Item) return null;
  return MarketingMessageSchema.parse(result.Item);
}

/** The SES webhook's primary lookup, via the sparse `ses-message-id-index` (only populated once a message has actually been sent). */
export async function getMarketingMessageBySesMessageId(sesMessageId: string): Promise<MarketingMessage | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_MARKETING_MESSAGES(),
      IndexName: 'ses-message-id-index',
      KeyConditionExpression: 'sesMessageId = :sesMessageId',
      ExpressionAttributeValues: { ':sesMessageId': sesMessageId },
      Limit: 1,
    }),
  );
  const items = result.Items ?? [];
  if (items.length === 0) return null;
  return MarketingMessageSchema.parse(items[0]);
}

/** Every message (sent or skipped) for one business, oldest first — the admin outreach timeline. */
export async function listMarketingMessagesForBusiness(businessId: string): Promise<MarketingMessage[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_MARKETING_MESSAGES(),
      KeyConditionExpression: 'businessId = :businessId',
      ExpressionAttributeValues: { ':businessId': businessId },
    }),
  );
  return (result.Items ?? []).map((item) => MarketingMessageSchema.parse(item));
}

/**
 * Every message across every business — the admin dashboard's KPI
 * aggregation (postcards delivered / emails sent per step / clicks /
 * bounces / unsubscribes). A bounded `Scan`, not a GSI query: matches this
 * repo's existing "GSI for hot-path point lookups, Scan for admin/analytics
 * aggregation" split already established by `lib/analytics/dashboard.ts`.
 */
export async function listAllMarketingMessages(): Promise<MarketingMessage[]> {
  const client = getDynamoDBClient();
  const items: MarketingMessage[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  let pages = 0;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: TABLE_MARKETING_MESSAGES(),
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const item of result.Items ?? []) {
      items.push(MarketingMessageSchema.parse(item));
    }
    exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    pages += 1;
  } while (exclusiveStartKey && pages < LIST_SAFETY_CAP_PAGES);

  return items;
}

/**
 * The send-once/skip-once idempotency guard — the sort key
 * (`` `${marketingCampaignId}#${emailSequence}` ``) already fully identifies
 * "this step for this business," so a conditional `PutItem`
 * (`attribute_not_exists(sortKey)`) is the entire mechanism, exactly
 * mirroring `putPostcardWebhookEvent`. Returns `false` (never throws) when
 * this step already has a message recorded — the caller must not advance
 * `MarketingOutreach` a second time.
 */
export async function putMarketingMessageIfNotExists(message: MarketingMessage): Promise<boolean> {
  MarketingMessageSchema.parse(message);
  const client = getDynamoDBClient();
  try {
    await client.send(
      new PutCommand({
        TableName: TABLE_MARKETING_MESSAGES(),
        Item: message,
        ConditionExpression: 'attribute_not_exists(sortKey)',
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

/** Applies an SES webhook event's rollup to the message it references — unconditional (the caller only calls this once `putMarketingSesEventIfNotExists` has confirmed the event was newly recorded, which is the actual dedup guard). */
export async function applyMarketingMessageSesRollup(
  businessId: string,
  sortKey: string,
  update: { sesEventStatus: MarketingSesEventStatus; deliveredAt?: string; bouncedAt?: string; complainedAt?: string },
): Promise<void> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  const values: Record<string, unknown> = { ':sesEventStatus': update.sesEventStatus, ':now': now };
  const setClauses = ['sesEventStatus = :sesEventStatus', 'updatedAt = :now'];

  if (update.deliveredAt !== undefined) {
    values[':deliveredAt'] = update.deliveredAt;
    setClauses.push('deliveredAt = :deliveredAt');
  }
  if (update.bouncedAt !== undefined) {
    values[':bouncedAt'] = update.bouncedAt;
    setClauses.push('bouncedAt = :bouncedAt');
  }
  if (update.complainedAt !== undefined) {
    values[':complainedAt'] = update.complainedAt;
    setClauses.push('complainedAt = :complainedAt');
  }

  await client.send(
    new UpdateCommand({
      TableName: TABLE_MARKETING_MESSAGES(),
      Key: { businessId, sortKey },
      UpdateExpression: `SET ${setClauses.join(', ')}`,
      ExpressionAttributeValues: values,
    }),
  );
}

/** Best-effort click rollup — called by `/e/[token]` after the durable `MarketingClick` row is already written. Never blocks the redirect (see that route's own try/catch). `attribute_exists` guards against resurrecting a rollup on a since-deleted message. */
export async function recordMarketingMessageClickRollup(businessId: string, sortKey: string, clickedAt: string): Promise<void> {
  const client = getDynamoDBClient();
  await client.send(
    new UpdateCommand({
      TableName: TABLE_MARKETING_MESSAGES(),
      Key: { businessId, sortKey },
      ConditionExpression: 'attribute_exists(businessId)',
      UpdateExpression:
        'SET clickCount = if_not_exists(clickCount, :zero) + :one, ' +
        'firstClickAt = if_not_exists(firstClickAt, :clickedAt), lastClickAt = :clickedAt, updatedAt = :clickedAt',
      ExpressionAttributeValues: { ':zero': 0, ':one': 1, ':clickedAt': clickedAt },
    }),
  );
}
