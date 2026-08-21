import 'server-only';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { MarketingClick } from '@/domain/models/marketing-click';
import { MarketingClickSchema } from '@/domain/schemas/marketing-click.schema';
import { getDynamoDBClient, TABLE_MARKETING_CLICKS } from './client';

export async function putMarketingClick(click: MarketingClick): Promise<void> {
  MarketingClickSchema.parse(click);
  const client = getDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_MARKETING_CLICKS(),
      Item: click,
    }),
  );
}

/** Every click on one message, newest first — the admin outreach timeline. */
export async function listMarketingClicksForMessage(messageId: string): Promise<MarketingClick[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_MARKETING_CLICKS(),
      KeyConditionExpression: 'messageId = :messageId',
      ExpressionAttributeValues: { ':messageId': messageId },
      ScanIndexForward: false,
    }),
  );
  return (result.Items ?? []).map((item) => MarketingClickSchema.parse(item));
}
