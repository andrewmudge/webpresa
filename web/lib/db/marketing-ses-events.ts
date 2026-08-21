import 'server-only';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { MarketingSesEvent } from '@/domain/models/marketing-ses-event';
import { MarketingSesEventSchema } from '@/domain/schemas/marketing-ses-event.schema';
import { getDynamoDBClient, TABLE_MARKETING_SES_EVENTS } from './client';

/**
 * `snsMessageId` is SNS's own globally-unique envelope id — a conditional
 * `PutItem` (`attribute_not_exists`) is the entire dedup mechanism,
 * mirroring `putPostcardWebhookEvent`. Returns `false` (never throws) on a
 * duplicate delivery, so the webhook route can distinguish "already
 * processed, no-op" from a genuine failure.
 */
export async function putMarketingSesEventIfNotExists(event: MarketingSesEvent): Promise<boolean> {
  MarketingSesEventSchema.parse(event);
  const client = getDynamoDBClient();
  try {
    await client.send(
      new PutCommand({
        TableName: TABLE_MARKETING_SES_EVENTS(),
        Item: event,
        ConditionExpression: 'attribute_not_exists(snsMessageId)',
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

/** Every SES event for one message, oldest first — the admin outreach timeline's delivery/bounce/complaint history. */
export async function listMarketingSesEventsForMessage(sesMessageId: string): Promise<MarketingSesEvent[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_MARKETING_SES_EVENTS(),
      IndexName: 'ses-message-id-index',
      KeyConditionExpression: 'sesMessageId = :sesMessageId',
      ExpressionAttributeValues: { ':sesMessageId': sesMessageId },
    }),
  );
  return (result.Items ?? []).map((item) => MarketingSesEventSchema.parse(item));
}
