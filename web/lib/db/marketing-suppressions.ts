import 'server-only';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { MarketingSuppression } from '@/domain/models/marketing-suppression';
import { MarketingSuppressionSchema } from '@/domain/schemas/marketing-suppression.schema';
import { getDynamoDBClient, TABLE_MARKETING_SUPPRESSIONS } from './client';

/** The eligibility check's sole lookup — one `GetItem` covers unsubscribe/hard-bounce/complaint/admin-suppression uniformly. */
export async function getMarketingSuppression(emailNormalized: string): Promise<MarketingSuppression | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_MARKETING_SUPPRESSIONS(),
      Key: { emailNormalized },
    }),
  );
  if (!result.Item) return null;
  return MarketingSuppressionSchema.parse(result.Item);
}

/**
 * Idempotent — a second unsubscribe-link visit, a duplicate hard-bounce
 * event, or an admin re-suppressing an already-suppressed address are all
 * harmless no-ops (`false`, never throws). First writer wins; a suppression
 * is never overwritten or deleted once recorded.
 */
export async function putMarketingSuppressionIfNotExists(suppression: MarketingSuppression): Promise<boolean> {
  MarketingSuppressionSchema.parse(suppression);
  const client = getDynamoDBClient();
  try {
    await client.send(
      new PutCommand({
        TableName: TABLE_MARKETING_SUPPRESSIONS(),
        Item: suppression,
        ConditionExpression: 'attribute_not_exists(emailNormalized)',
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}
