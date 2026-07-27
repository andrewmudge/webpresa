import 'server-only';
import { GetCommand, PutCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { StockImage, StockImageKind, StockHeroVariant } from '@/domain/models/stock-image';
import type { Industry } from '@/domain/constants/industries';
import { StockImageSchema } from '@/domain/schemas/stock-image.schema';
import { getDynamoDBClient, TABLE_STOCK_IMAGES } from './client';

/**
 * `industry-kind-index`'s partition key — computed at write time, never
 * part of the validated `StockImage` shape itself (mirrors how other tables
 * in this project keep GSI-only attributes out of the Zod schema). Encodes
 * all three filter dimensions (industry, kind, variant) so a lookup for
 * e.g. "the default desktop hero for plumbing" is a single indexed query,
 * entirely independent of the equivalent mobile lookup.
 */
function filterKey(image: Pick<StockImage, 'industry' | 'kind' | 'variant'>): string {
  return `${image.industry ?? 'general'}#${image.kind}#${image.variant ?? 'none'}`;
}

function parseStockImageItem(raw: unknown): StockImage {
  const item = { ...(raw as Record<string, unknown>) };
  delete item.industryKind;
  return StockImageSchema.parse(item);
}

export async function getStockImageById(stockImageId: string): Promise<StockImage | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_STOCK_IMAGES(),
      Key: { stockImageId },
    }),
  );
  if (!result.Item) return null;
  return parseStockImageItem(result.Item);
}

/** Validates before putting. Use for both creates and full replacements. */
export async function putStockImage(image: StockImage): Promise<void> {
  StockImageSchema.parse(image); // throws ZodError on invalid input
  const client = getDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_STOCK_IMAGES(),
      Item: { ...image, industryKind: filterKey(image) },
    }),
  );
}

export async function deleteStockImageById(stockImageId: string): Promise<void> {
  const client = getDynamoDBClient();
  await client.send(
    new DeleteCommand({
      TableName: TABLE_STOCK_IMAGES(),
      Key: { stockImageId },
    }),
  );
}

/**
 * Newest-first list of stock images matching an exact (industry, kind,
 * variant) group, via `industry-kind-index`. `variant` should be omitted
 * for `kind: 'general'` (which never has one). Used both by
 * `getDefaultHeroImage` and by `setDefaultStockImageAction` to find the
 * sibling group to clear `isDefault` on.
 */
export async function listStockImages(
  industry: Industry | 'general',
  kind: StockImageKind,
  variant?: StockHeroVariant,
): Promise<StockImage[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_STOCK_IMAGES(),
      IndexName: 'industry-kind-index',
      KeyConditionExpression: 'industryKind = :industryKind',
      ExpressionAttributeValues: { ':industryKind': `${industry}#${kind}#${variant ?? 'none'}` },
      ScanIndexForward: false,
    }),
  );
  return (result.Items ?? []).map((item) => parseStockImageItem(item));
}

/** Every stock image, unfiltered — used by the admin Stock Images gallery. Fine at this volume (curated, admin-only uploads). */
export async function listAllStockImages(): Promise<StockImage[]> {
  const client = getDynamoDBClient();
  const items: StockImage[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: TABLE_STOCK_IMAGES(),
        Limit: 200,
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const item of result.Items ?? []) {
      items.push(parseStockImageItem(item));
    }
    exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (exclusiveStartKey);

  return items;
}

/**
 * The auto hero-pick tier's stock lookup (see `lib/image/resolve-hero-image.ts`)
 * — desktop and mobile are always looked up independently via separate
 * calls to this function, never as a pair. Prefers the active image flagged
 * `isDefault`, else the most-recently-uploaded active image for that exact
 * (industry, variant) group, else `null` when none exist yet.
 */
export async function getDefaultHeroImage(industry: Industry, variant: StockHeroVariant): Promise<StockImage | null> {
  const images = await listStockImages(industry, 'hero', variant);
  const active = images.filter((image) => image.status === 'active');
  return active.find((image) => image.isDefault) ?? active[0] ?? null;
}
