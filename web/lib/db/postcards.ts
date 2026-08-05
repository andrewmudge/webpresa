import 'server-only';
import { QueryCommand, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { Postcard } from '@/domain/models/postcard';
import { PostcardSchema } from '@/domain/schemas/postcard.schema';
import { getDynamoDBClient, TABLE_POSTCARDS } from './client';

/** The Postcard generated for one CampaignRecipient, if any — a CampaignRecipient has at most one Postcard (see `CampaignRecipient.postcardId`). */
export async function getPostcardByCampaignRecipientId(campaignRecipientId: string): Promise<Postcard | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_POSTCARDS(),
      IndexName: 'campaign-recipient-id-index',
      KeyConditionExpression: 'campaignRecipientId = :campaignRecipientId',
      ExpressionAttributeValues: { ':campaignRecipientId': campaignRecipientId },
      Limit: 1,
    }),
  );
  const items = result.Items ?? [];
  if (items.length === 0) return null;
  return PostcardSchema.parse(items[0]);
}

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

export async function deletePostcardById(postcardId: string): Promise<void> {
  const client = getDynamoDBClient();
  await client.send(
    new DeleteCommand({
      TableName: TABLE_POSTCARDS(),
      Key: { postcardId },
    }),
  );
}
