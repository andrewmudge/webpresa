import 'server-only';
import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
  type ScanCommandInput,
} from '@aws-sdk/lib-dynamodb';
import type { Business } from '@/domain/models/business';
import { BusinessSchema } from '@/domain/schemas/business.schema';
import { getDynamoDBClient, TABLE_BUSINESSES } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ListBusinessesOptions {
  limit?: number;
  /** Opaque pagination cursor returned from a previous call. */
  cursor?: string;
  /** Filter by status.  If omitted, all statuses are returned. */
  status?: string;
  /** Filter by industry. If omitted, all industries are returned. */
  industry?: string;
  /** Filter by source. If omitted, all sources are returned. */
  source?: string;
  /** Case-insensitive substring match against address.city. */
  city?: string;
  /** Case-insensitive substring match against address.state. */
  state?: string;
  /** Inclusive lower bound on createdAt, as a YYYY-MM-DD date string. */
  createdFrom?: string;
  /** Inclusive upper bound on createdAt, as a YYYY-MM-DD date string. */
  createdTo?: string;
  /** Filter by qualification (Stage 15) — matches the effective value (`adminReviewedQualification` when set, else `qualification`). If omitted, all qualifications are returned. */
  qualification?: string;
}

export interface ListBusinessesResult {
  items: Business[];
  /** Cursor to pass as `cursor` in the next call.  Undefined when exhausted. */
  nextCursor?: string;
}

// ---------------------------------------------------------------------------
// Cursor encoding
// ---------------------------------------------------------------------------

function encodeCursor(key: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(key), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Filtering (in-application — no GSI supports these combined dimensions)
// ---------------------------------------------------------------------------

type BusinessFilters = Pick<
  ListBusinessesOptions,
  'status' | 'industry' | 'source' | 'city' | 'state' | 'createdFrom' | 'createdTo' | 'qualification'
>;

function hasAnyFilter(filters: BusinessFilters): boolean {
  return Object.values(filters).some((v) => v !== undefined && v !== '');
}

/**
 * Pure predicate — exported for unit testing independent of DynamoDB.
 * City/state are case-insensitive substring matches (free-text filter
 * inputs); status/industry/source are exact matches (dropdown filters);
 * createdFrom/createdTo compare against the date-only (YYYY-MM-DD) prefix
 * of `createdAt` so the "to" boundary includes the whole day, not just
 * midnight. `qualification` matches the effective value — the Stage 15
 * admin override when set, else the AI-produced value — the same
 * override-wins precedence `BusinessTable.tsx`'s `QualificationCell` already
 * displays, so filtering by "Qualified" surfaces exactly what the list
 * shows as qualified.
 */
export function matchesBusinessFilters(business: Business, filters: BusinessFilters): boolean {
  if (filters.status && business.status !== filters.status) return false;
  if (filters.industry && business.industry !== filters.industry) return false;
  if (filters.source && business.source !== filters.source) return false;
  if (filters.city && !(business.address?.city ?? '').toLowerCase().includes(filters.city.toLowerCase())) {
    return false;
  }
  if (filters.state && !(business.address?.state ?? '').toLowerCase().includes(filters.state.toLowerCase())) {
    return false;
  }
  const createdDate = business.createdAt.slice(0, 10);
  if (filters.createdFrom && createdDate < filters.createdFrom) return false;
  if (filters.createdTo && createdDate > filters.createdTo) return false;
  if (filters.qualification && (business.adminReviewedQualification ?? business.qualification) !== filters.qualification) {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

/** Raw scan page size for the filtered path — see `listBusinesses` below. */
const FILTERED_SCAN_PAGE_SIZE = 50;
/** Safety cap matching `listAllBusinesses` — bounds worst-case scan cost for a selective filter. */
const FILTERED_SCAN_SAFETY_CAP_PAGES = 40;

/**
 * Retrieve businesses, newest-first (scan order), with cursor pagination.
 * For production scale this should query via a GSI with a high-cardinality key.
 *
 * When any filter is supplied, DynamoDB is scanned in pages and filtered in
 * application code (no GSI supports status+industry+source+city+state+date
 * together) — acceptable at today's dev scale, matching the same tradeoff
 * `listAllBusinesses` already documents. A full page is always filtered
 * before checking whether `limit` is satisfied, so `nextCursor` never skips
 * a matching item that happened to sit after the limit was reached
 * mid-page — the returned page may therefore occasionally contain more
 * than `limit` items rather than lose one.
 */
export async function listBusinesses(
  opts: ListBusinessesOptions = {},
): Promise<ListBusinessesResult> {
  const { limit = 50, cursor, ...filters } = opts;
  const client = getDynamoDBClient();

  if (!hasAnyFilter(filters)) {
    const params: ScanCommandInput = {
      TableName: TABLE_BUSINESSES(),
      Limit: limit,
      ...(cursor ? { ExclusiveStartKey: decodeCursor(cursor) } : {}),
    };
    const result = await client.send(new ScanCommand(params));
    const items = (result.Items ?? []).map((item) => BusinessSchema.parse(item));
    return {
      items,
      nextCursor: result.LastEvaluatedKey ? encodeCursor(result.LastEvaluatedKey) : undefined,
    };
  }

  const items: Business[] = [];
  let exclusiveStartKey = cursor ? decodeCursor(cursor) : undefined;
  let pages = 0;
  let exhausted = false;

  while (items.length < limit && pages < FILTERED_SCAN_SAFETY_CAP_PAGES) {
    const result = await client.send(
      new ScanCommand({
        TableName: TABLE_BUSINESSES(),
        Limit: FILTERED_SCAN_PAGE_SIZE,
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const raw of result.Items ?? []) {
      const business = BusinessSchema.parse(raw);
      if (matchesBusinessFilters(business, filters)) items.push(business);
    }
    exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    pages += 1;
    if (!exclusiveStartKey) {
      exhausted = true;
      break;
    }
  }

  return {
    items,
    nextCursor: exhausted ? undefined : exclusiveStartKey ? encodeCursor(exclusiveStartKey) : undefined,
  };
}

/**
 * Retrieve a single business by its primary key.
 */
export async function getBusinessById(businessId: string): Promise<Business | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_BUSINESSES(),
      Key: { businessId },
    }),
  );
  if (!result.Item) return null;
  return BusinessSchema.parse(result.Item);
}

/**
 * Retrieve a single business by slug using the slug-index GSI.
 */
export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_BUSINESSES(),
      IndexName: 'slug-index',
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: { ':slug': slug },
      Limit: 1,
    }),
  );
  const items = result.Items ?? [];
  if (items.length === 0) return null;
  return BusinessSchema.parse(items[0]);
}

/**
 * Retrieve a single business by Google Place ID using the
 * google-place-id-index GSI. The fast-path duplicate check for Stage 12
 * (Google Places Discovery) — a Place ID match is definitive.
 */
export async function getBusinessByGooglePlaceId(googlePlaceId: string): Promise<Business | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_BUSINESSES(),
      IndexName: 'google-place-id-index',
      KeyConditionExpression: 'googlePlaceId = :googlePlaceId',
      ExpressionAttributeValues: { ':googlePlaceId': googlePlaceId },
      Limit: 1,
    }),
  );
  const items = result.Items ?? [];
  if (items.length === 0) return null;
  return BusinessSchema.parse(items[0]);
}

/**
 * Retrieve every business in the table, paging through Scan until
 * exhausted (or a safety cap is hit). Used for the domain/phone/name+address
 * duplicate-detection signals (Stage 12) that have no dedicated GSI —
 * acceptable at today's dev scale; a high-cardinality index would be needed
 * before this could run against a large production table.
 */
const LIST_ALL_SAFETY_CAP_PAGES = 40;

export async function listAllBusinesses(): Promise<Business[]> {
  const client = getDynamoDBClient();
  const items: Business[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  let pages = 0;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: TABLE_BUSINESSES(),
        Limit: 200,
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const item of result.Items ?? []) {
      items.push(BusinessSchema.parse(item));
    }
    exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    pages += 1;
  } while (exclusiveStartKey && pages < LIST_ALL_SAFETY_CAP_PAGES);

  return items;
}

/**
 * Write a complete Business record.  Validates before putting.
 * Use for both creates and full replacements.
 */
export async function putBusiness(business: Business): Promise<void> {
  BusinessSchema.parse(business); // throws ZodError on invalid input
  const client = getDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_BUSINESSES(),
      Item: business,
    }),
  );
}

/**
 * Partially update a Business, updating `updatedAt` to the current time.
 * Returns the full updated record.
 */
export async function updateBusiness(
  businessId: string,
  updates: Partial<Omit<Business, 'businessId' | 'createdAt'>>,
): Promise<Business> {
  const existing = await getBusinessById(businessId);
  if (!existing) {
    throw new Error(`Business not found: ${businessId}`);
  }

  const now = new Date().toISOString();
  const merged: Business = {
    ...existing,
    ...updates,
    businessId,
    createdAt: existing.createdAt,
    updatedAt: now,
  };

  BusinessSchema.parse(merged);

  const client = getDynamoDBClient();

  // Build a dynamic UpdateExpression from the provided updates + updatedAt.
  const updatableFields: Record<string, unknown> = { ...updates, updatedAt: now };
  const setExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updatableFields)) {
    const nameAlias = `#${key}`;
    const valueAlias = `:${key}`;
    setExpressions.push(`${nameAlias} = ${valueAlias}`);
    expressionAttributeNames[nameAlias] = key;
    expressionAttributeValues[valueAlias] = value;
  }

  await client.send(
    new UpdateCommand({
      TableName: TABLE_BUSINESSES(),
      Key: { businessId },
      UpdateExpression: `SET ${setExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }),
  );

  return merged;
}

/**
 * Generate a unique slug for a business name, appending an incrementing
 * numeric suffix if the base slug is already taken.
 */
export async function resolveUniqueSlug(baseSlug: string): Promise<string> {
  const existing = await getBusinessBySlug(baseSlug);
  if (!existing) return baseSlug;

  let suffix = 2;
  while (suffix < 1000) {
    const candidate = `${baseSlug}-${suffix}`;
    const taken = await getBusinessBySlug(candidate);
    if (!taken) return candidate;
    suffix++;
  }

  throw new Error(`Could not generate a unique slug for: ${baseSlug}`);
}

export async function deleteBusinessById(businessId: string): Promise<void> {
  const client = getDynamoDBClient();
  await client.send(
    new DeleteCommand({
      TableName: TABLE_BUSINESSES(),
      Key: { businessId },
    }),
  );
}
