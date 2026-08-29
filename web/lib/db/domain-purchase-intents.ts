import 'server-only';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
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

/**
 * The webhook's real correlation path — see the model's doc comment for why
 * `storefrontUsername`, not `intentId`, is the lookup key. Newest first;
 * the caller takes the first `'pending'` one (a customer normally has at
 * most one in-flight purchase, but nothing prevents starting a second
 * before the first's webhook arrives).
 */
export async function listDomainPurchaseIntentsByStorefrontUsername(storefrontUsername: string): Promise<DomainPurchaseIntent[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_DOMAIN_PURCHASE_INTENTS(),
      IndexName: 'storefront-username-index',
      KeyConditionExpression: 'storefrontUsername = :storefrontUsername',
      ExpressionAttributeValues: { ':storefrontUsername': storefrontUsername },
      ScanIndexForward: false,
    }),
  );
  return (result.Items ?? []).map((item) => DomainPurchaseIntentSchema.parse(item));
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
