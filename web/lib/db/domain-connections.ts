import 'server-only';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DomainConnection } from '@/domain/models/domain-connection';
import { DomainConnectionSchema } from '@/domain/schemas/domain-connection.schema';
import { getDynamoDBClient, TABLE_DOMAIN_CONNECTIONS } from './client';

export async function getDomainConnectionByNormalizedDomain(normalizedDomain: string): Promise<DomainConnection | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_DOMAIN_CONNECTIONS(),
      Key: { normalizedDomain },
    }),
  );
  if (!result.Item) return null;
  return DomainConnectionSchema.parse(result.Item);
}

/** Newest first — callers derive "the active one" (e.g. `.find(c => c.status !== 'disconnected')`), same pattern `listPreviewsForBusiness` already uses. */
export async function listDomainConnectionsForBusiness(businessId: string): Promise<DomainConnection[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_DOMAIN_CONNECTIONS(),
      IndexName: 'business-id-index',
      KeyConditionExpression: 'businessId = :businessId',
      ExpressionAttributeValues: { ':businessId': businessId },
      ScanIndexForward: false,
    }),
  );
  return (result.Items ?? []).map((item) => DomainConnectionSchema.parse(item));
}

export async function putDomainConnection(record: DomainConnection): Promise<void> {
  DomainConnectionSchema.parse(record);
  const client = getDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_DOMAIN_CONNECTIONS(),
      Item: record,
    }),
  );
}

/**
 * Atomic domain reservation. Two concurrent requests for the same
 * `normalizedDomain` can never both succeed — the loser's `false` return
 * means the caller must re-read to see who actually won (see
 * `lib/domains/connect.ts`, `startDomainConnection`). This is the real
 * uniqueness guarantee for domain assignment — see
 * implementation.md, Stage 19.x, Part 2, "Why normalizedDomain is the
 * partition key, not a GSI".
 */
export async function createDomainConnectionRecord(record: DomainConnection): Promise<boolean> {
  DomainConnectionSchema.parse(record);
  const client = getDynamoDBClient();
  try {
    await client.send(
      new PutCommand({
        TableName: TABLE_DOMAIN_CONNECTIONS(),
        Item: record,
        ConditionExpression: 'attribute_not_exists(normalizedDomain)',
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}
