import 'server-only';
import { QueryCommand, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { SitePreview } from '@/domain/models/site-preview';
import { SitePreviewSchema } from '@/domain/schemas/site-preview.schema';
import { createSitePreview } from '@/domain/factories/site-preview.factory';
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

/**
 * Publishes a `draft`/`ready` preview — the missing piece that makes a
 * business's public preview (`/b/[slug]`) actually reachable by a real,
 * non-admin visitor. `resolvePreview()` (`app/b/[slug]/page.tsx`) only ever
 * shows a `published` preview to anyone without an admin session, so a
 * business with no published preview effectively doesn't exist publicly yet
 * — this is what fixes that.
 *
 * Only one preview per business is ever `published` at a time: any other
 * currently-published preview for the same business is archived first, so
 * `getPreviewsBySlug()`'s `.find(p => p.status === 'published')` always
 * resolves to exactly the one just published, never a stale earlier version.
 */
export async function publishSitePreview(previewId: string): Promise<SitePreview | null> {
  const target = await getSitePreviewById(previewId);
  if (!target) return null;

  const siblings = await listPreviewsForBusiness(target.businessId);
  const now = new Date().toISOString();

  await Promise.all(
    siblings
      .filter((p) => p.previewId !== previewId && p.status === 'published')
      .map((p) => putSitePreview({ ...p, status: 'archived', updatedAt: now })),
  );

  const published: SitePreview = { ...target, status: 'published', updatedAt: now };
  await putSitePreview(published);
  return published;
}


/**
 * Copy-on-write draft resolution (Stage 19 — Customer Website Dashboard).
 *
 * The admin editing actions all patch whichever preview is currently newest
 * **in place**, even when it's already `published` — edits go live
 * immediately, by design, for a trusted admin. A customer must never get
 * that behavior: their first edit on top of a live site needs to land on a
 * fresh draft, not silently overwrite what's public. Returns the current
 * newest preview unchanged when it's already a draft/ready (so a second
 * edit in the same session keeps patching the same draft, exactly like the
 * admin path already does), or clones it into a new `draft` version — same
 * content, `version + 1` — when it's `published` or `archived`.
 *
 * Returns `null` only when the business has no preview at all yet (nothing
 * to clone) — callers decide how to handle "no live site" themselves.
 */
export async function ensureDraftPreview(businessId: string): Promise<SitePreview | null> {
  const previews = await listPreviewsForBusiness(businessId);
  const latest = previews[0];
  if (!latest) return null;
  if (latest.status === 'draft' || latest.status === 'ready') return latest;

  const draft = createSitePreview({
    businessId: latest.businessId,
    slug: latest.slug,
    templateId: latest.templateId,
    content: latest.content,
    theme: latest.theme,
    generationMetadata: latest.generationMetadata,
    previousVersion: latest.version,
  });
  await putSitePreview(draft);
  return draft;
}

export async function deletePreviewById(previewId: string): Promise<void> {
  const client = getDynamoDBClient();
  await client.send(
    new DeleteCommand({
      TableName: TABLE_SITE_PREVIEWS(),
      Key: { previewId },
    }),
  );
}
