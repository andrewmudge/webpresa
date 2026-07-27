import 'server-only';
import { GetCommand, PutCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { StockImage, StockImageKind } from '@/domain/models/stock-image';
import type { Industry } from '@/domain/constants/industries';
import { StockImageSchema } from '@/domain/schemas/stock-image.schema';
import { getDynamoDBClient, TABLE_STOCK_IMAGES } from './client';

/**
 * `industry-kind-index`'s partition key — computed at write time, never
 * part of the validated `StockImage` shape itself (mirrors how other tables
 * in this project keep GSI-only attributes out of the Zod schema). Absent
 * `industry` maps to the `'general'` pool.
 */
function industryKindKey(image: Pick<StockImage, 'industry' | 'kind'>): string {
  return `${image.industry ?? 'general'}#${image.kind}`;
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
      Item: { ...image, industryKind: industryKindKey(image) },
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
 * Newest-first list of stock images for one industry (or `'general'` for
 * the uncategorized pool) and kind, via `industry-kind-index`. Doubles as
 * the Phase 2 "browse by industry, filter by kind" query — no redesign
 * needed when that UI is built.
 */
export async function listStockImagesByIndustry(
  industry: Industry | 'general',
  kind: StockImageKind,
): Promise<StockImage[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_STOCK_IMAGES(),
      IndexName: 'industry-kind-index',
      KeyConditionExpression: 'industryKind = :industryKind',
      ExpressionAttributeValues: { ':industryKind': `${industry}#${kind}` },
      ScanIndexForward: false,
    }),
  );
  return (result.Items ?? []).map((item) => parseStockImageItem(item));
}

/** Every stock image, unfiltered — used by the admin Stock Images list. Fine at this volume (curated, admin-only uploads). */
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
 * The auto hero-pick tier's stock lookup (see `lib/image/resolve-hero-image.ts`):
 * prefers the active set flagged `isDefault`, else the most-recently-uploaded
 * active set for that industry, else `null` when none exist yet.
 */
export async function getDefaultStockHeroSet(industry: Industry): Promise<StockImage | null> {
  const sets = await listStockImagesByIndustry(industry, 'hero');
  const active = sets.filter((set) => set.status === 'active');
  return active.find((set) => set.isDefault) ?? active[0] ?? null;
}
