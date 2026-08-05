import 'server-only';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { PostcardWebhookEvent } from '@/domain/models/postcard-webhook-event';
import { PostcardWebhookEventSchema } from '@/domain/schemas/postcard-webhook-event.schema';
import { getDynamoDBClient, TABLE_POSTCARD_WEBHOOK_EVENTS } from './client';

/**
 * Records a newly received Lob webhook event, or does nothing if
 * `event.lobEventId` was already recorded — the entire dedup mechanism for
 * "duplicate webhook deliveries must not create duplicate history entries."
 * Returns `true` when the event was newly recorded (the caller should then
 * update `Postcard`'s rollup fields), `false` on a dedup no-op.
 */
export async function putPostcardWebhookEvent(event: PostcardWebhookEvent): Promise<boolean> {
  PostcardWebhookEventSchema.parse(event);
  const client = getDynamoDBClient();
  try {
    await client.send(
      new PutCommand({
        TableName: TABLE_POSTCARD_WEBHOOK_EVENTS(),
        Item: event,
        ConditionExpression: 'attribute_not_exists(lobEventId)',
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

/** Every webhook event received for one postcard, oldest first — the admin status-timeline panel. */
export async function listWebhookEventsForPostcard(postcardId: string): Promise<PostcardWebhookEvent[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_POSTCARD_WEBHOOK_EVENTS(),
      IndexName: 'postcard-id-index',
      KeyConditionExpression: 'postcardId = :postcardId',
      ExpressionAttributeValues: { ':postcardId': postcardId },
    }),
  );
  return (result.Items ?? []).map((item) => PostcardWebhookEventSchema.parse(item));
}
