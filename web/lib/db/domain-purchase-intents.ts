import 'server-only';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { DomainPurchaseIntent } from '@/domain/models/domain-purchase-intent';
import { DomainPurchaseIntentSchema } from '@/domain/schemas/domain-purchase-intent.schema';
import { getDynamoDBClient, TABLE_DOMAIN_PURCHASE_INTENTS } from './client';

export async function getDomainPurchaseIntent(intentId: string): Promise<DomainPurchaseIntent | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_DOMAIN_PURCHASE_INTENTS(),
      Key: { intentId },
    }),
  );
  if (!result.Item) return null;
  return DomainPurchaseIntentSchema.parse(result.Item);
}

export async function putDomainPurchaseIntent(record: DomainPurchaseIntent): Promise<void> {
  DomainPurchaseIntentSchema.parse(record);
  const client = getDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_DOMAIN_PURCHASE_INTENTS(),
      Item: record,
    }),
  );
}
