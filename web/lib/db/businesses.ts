import 'server-only';
import {
  GetCommand,
  PutCommand,
  UpdateCommand,
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
// Repository
// ---------------------------------------------------------------------------

/**
 * Retrieve all businesses, newest-first (scan order), with cursor pagination.
 * For production scale this should query via a GSI with a high-cardinality key.
 */
export async function listBusinesses(
  opts: ListBusinessesOptions = {},
): Promise<ListBusinessesResult> {
  const { limit = 50, cursor } = opts;
  const client = getDynamoDBClient();

  const params: ScanCommandInput = {
    TableName: TABLE_BUSINESSES(),
    Limit: limit,
    ...(cursor ? { ExclusiveStartKey: decodeCursor(cursor) } : {}),
  };

  const result = await client.send(new ScanCommand(params));

  const items = (result.Items ?? []).map((item) => BusinessSchema.parse(item));

  return {
    items,
    nextCursor: result.LastEvaluatedKey
      ? encodeCursor(result.LastEvaluatedKey)
      : undefined,
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
