import 'server-only';
import { QueryCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { SitePreview } from '@/domain/models/site-preview';
import { SitePreviewSchema } from '@/domain/schemas/site-preview.schema';
import { getDynamoDBClient, TABLE_SITE_PREVIEWS } from './client';

export async function getSitePreviewById(previewId: string): Promise<SitePreview | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_SITE_PREVIEWS(),
      Key: { previewId },
    }),
  );
  if (!result.Item) return null;
  return SitePreviewSchema.parse(result.Item);
}

/**
 * Return all SitePreview records that share a slug, sorted by version
 * descending (highest / most recent version first).
 *
 * Uses the `slug-index` GSI as required by the Stage 8 spec.
 * The caller is responsible for filtering to the desired status(es).
 */
export async function getPreviewsBySlug(slug: string): Promise<SitePreview[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_SITE_PREVIEWS(),
      IndexName: 'slug-index',
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: { ':slug': slug },
    }),
  );
  const items = (result.Items ?? []).map((item) => SitePreviewSchema.parse(item));
  // Sort highest version first — GSI has no sort key, so order in code.
  return items.sort((a, b) => b.version - a.version);
}

/**
 * List all previews for a business, ordered by `createdAt` descending (newest first).
 */
export async function listPreviewsForBusiness(
  businessId: string,
): Promise<SitePreview[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_SITE_PREVIEWS(),
      IndexName: 'business-id-index',
      KeyConditionExpression: 'businessId = :businessId',
      ExpressionAttributeValues: { ':businessId': businessId },
      ScanIndexForward: false, // newest first
    }),
  );
  return (result.Items ?? []).map((item) => SitePreviewSchema.parse(item));
}

export async function putSitePreview(preview: SitePreview): Promise<void> {
  SitePreviewSchema.parse(preview);
  const client = getDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_SITE_PREVIEWS(),
      Item: preview,
    }),
  );
}

