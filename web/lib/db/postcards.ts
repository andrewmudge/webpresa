import 'server-only';
import { QueryCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Postcard } from '@/domain/models/postcard';
import { PostcardSchema } from '@/domain/schemas/postcard.schema';
import { getDynamoDBClient, TABLE_POSTCARDS } from './client';

export async function getPostcardById(postcardId: string): Promise<Postcard | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_POSTCARDS(),
      Key: { postcardId },
    }),
  );
  if (!result.Item) return null;
  return PostcardSchema.parse(result.Item);
}

/**
 * List all postcards for a business, ordered by `createdAt` descending (newest first).
 */
export async function listPostcardsForBusiness(businessId: string): Promise<Postcard[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_POSTCARDS(),
      IndexName: 'business-id-index',
      KeyConditionExpression: 'businessId = :businessId',
      ExpressionAttributeValues: { ':businessId': businessId },
      ScanIndexForward: false,
    }),
  );
  return (result.Items ?? []).map((item) => PostcardSchema.parse(item));
}

export async function putPostcard(postcard: Postcard): Promise<void> {
  PostcardSchema.parse(postcard);
  const client = getDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_POSTCARDS(),
      Item: postcard,
    }),
  );
}
