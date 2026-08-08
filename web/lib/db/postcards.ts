import 'server-only';
import { QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { Postcard } from '@/domain/models/postcard';
import { PostcardSchema } from '@/domain/schemas/postcard.schema';
import { getDynamoDBClient, TABLE_POSTCARDS } from './client';

const LIST_SAFETY_CAP_PAGES = 40;

/**
 * Every postcard, newest first — the admin `/admin/postcards` list. A
 * bounded `Scan`, not a GSI query: postcard count stays small under manual,
 * one-at-a-time generation (Stage 22 MVP), the same YAGNI reasoning already
 * applied to `campaigns`/`customer-billing-profiles`.
 */
export async function listAllPostcards(): Promise<Postcard[]> {
  const client = getDynamoDBClient();
  const items: Postcard[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  let pages = 0;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: TABLE_POSTCARDS(),
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const item of result.Items ?? []) {
      items.push(PostcardSchema.parse(item));
    }
    exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    pages += 1;
  } while (exclusiveStartKey && pages < LIST_SAFETY_CAP_PAGES);

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return items;
}

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

/** Records a completed render (Phase 2) — called once both sides' PDFs have been uploaded to S3 by the postcard-render Lambda. */
export async function markPostcardRendered(
  postcardId: string,
  artifacts: { frontArtifactKey: string; backArtifactKey: string },
): Promise<void> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  await client.send(
    new UpdateCommand({
      TableName: TABLE_POSTCARDS(),
      Key: { postcardId },
      UpdateExpression: 'SET frontArtifactKey = :front, backArtifactKey = :back, renderedAt = :now, updatedAt = :now',
      ExpressionAttributeValues: { ':front': artifacts.frontArtifactKey, ':back': artifacts.backArtifactKey, ':now': now },
    }),
  );
}

/** Records explicit admin approval (Phase 3) — approval only unlocks submission, it never triggers it. */
export async function approvePostcard(postcardId: string, reviewedBy: string): Promise<void> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  await client.send(
    new UpdateCommand({
      TableName: TABLE_POSTCARDS(),
      Key: { postcardId },
      UpdateExpression: 'SET reviewedAt = :now, reviewedBy = :reviewedBy, updatedAt = :now',
      ExpressionAttributeValues: { ':now': now, ':reviewedBy': reviewedBy },
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
