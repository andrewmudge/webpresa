import 'server-only';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
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

/**
 * Idempotent `pending` → `submitting` guard (Phase 4) — the same
 * conditional-write shape `lib/db/claims.ts`'s `consumeClaim` uses, scaled
 * down to a single table/item since only one `Postcard` record is
 * involved here (no cross-table transaction needed). Returns `false`
 * (never throws) when the postcard wasn't `pending` — a second concurrent
 * submit attempt, or a retry after the first already moved past this
 * state — so the caller can distinguish "safely refused" from a genuine
 * DynamoDB error.
 */
export async function transitionPostcardToSubmitting(postcardId: string): Promise<boolean> {
  const client = getDynamoDBClient();
  try {
    await client.send(
      new UpdateCommand({
        TableName: TABLE_POSTCARDS(),
        Key: { postcardId },
        UpdateExpression: 'SET #status = :submitting, updatedAt = :now',
        ConditionExpression: '#status = :pending',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':submitting': 'submitting', ':pending': 'pending', ':now': new Date().toISOString() },
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

/** Finalizes a successful Lob submission — called only after `transitionPostcardToSubmitting` has already claimed the record. */
export async function markPostcardSubmitted(postcardId: string, params: { providerPostcardId: string; costCents?: number }): Promise<void> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  const names: Record<string, string> = { '#status': 'status' };
  const values: Record<string, unknown> = { ':submitted': 'submitted', ':providerPostcardId': params.providerPostcardId, ':now': now };
  let setClause = 'SET #status = :submitted, providerPostcardId = :providerPostcardId, submittedAt = :now, updatedAt = :now';
  if (params.costCents !== undefined) {
    setClause += ', costCents = :costCents';
    values[':costCents'] = params.costCents;
  }
  await client.send(
    new UpdateCommand({
      TableName: TABLE_POSTCARDS(),
      Key: { postcardId },
      UpdateExpression: setClause,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
}

/** Records a failed Lob submission attempt — called after `transitionPostcardToSubmitting` already moved the record to `submitting`, so this always transitions onward to a terminal `failed`, never back to `pending` (a fresh postcard would need to be generated, matching this stage's "no automatic retry" scope). */
export async function markPostcardSubmissionFailed(postcardId: string, failureReason: string): Promise<void> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  await client.send(
    new UpdateCommand({
      TableName: TABLE_POSTCARDS(),
      Key: { postcardId },
      UpdateExpression: 'SET #status = :failed, failureReason = :failureReason, updatedAt = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':failed': 'failed', ':failureReason': failureReason, ':now': now },
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
