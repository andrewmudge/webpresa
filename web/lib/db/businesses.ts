import 'server-only';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
  type ScanCommandInput,
} from '@aws-sdk/lib-dynamodb';
import type { Business, BusinessStatus } from '@/domain/models/business';
import { BUSINESS_STATUSES } from '@/domain/models/business';
import { BusinessSchema } from '@/domain/schemas/business.schema';
import { WEBSITE_SECTION_TYPES } from '@/domain/constants/website-sections';
import { getDynamoDBClient, TABLE_BUSINESSES } from './client';

// ---------------------------------------------------------------------------
// Read-time tolerance for removed section types
// ---------------------------------------------------------------------------

const KNOWN_SECTION_TYPES = new Set<string>(WEBSITE_SECTION_TYPES);
const KNOWN_STATUSES = new Set<string>(BUSINESS_STATUSES);

interface RawWebsiteSections {
  sections?: unknown[];
  [key: string]: unknown;
}

interface RawBusinessItem {
  websiteSections?: RawWebsiteSections;
  status?: unknown;
  [key: string]: unknown;
}

/**
 * Parses a raw DynamoDB item into a validated `Business`, tolerating two
 * kinds of stale data rather than rejecting the whole record:
 *
 * 1. A `websiteSections.sections` entry whose `component` no longer exists
 *    in the current catalog — e.g. the former `testimonials` section,
 *    merged into `reviews` (see build_log.md).
 * 2. A `status` value from the pre-funnel-redesign enum (`active`/
 *    `inactive`/`archived` — `pending` is shared by both enums and never
 *    hits this path). Substituted with `'pending'` so a business that
 *    hasn't been through the one-off backfill script yet still loads
 *    everywhere (`getBusinessById`, the admin list, `/b/[slug]`) instead of
 *    throwing on every read until the backfill runs.
 *
 * `BusinessSchema`'s corresponding fields are intentionally strict
 * (`z.enum(...)`) so a *new* save can never persist an unsupported value —
 * but applied unmodified to a *read*, that same strictness would reject the
 * entire business record over one stale field. This mirrors
 * `resolveStoredOrDefaultSections`'s render-time leniency
 * (`lib/website-sections/resolve.ts`) one layer earlier, so a legacy record
 * never even fails to load. Write paths (`putBusiness`/`updateBusiness`)
 * intentionally keep calling `BusinessSchema.parse()` directly — full
 * strictness for anything actually being persisted going forward.
 */
function parseBusinessItem(raw: unknown): Business {
  const item = raw as RawBusinessItem;

  const sections = item?.websiteSections?.sections;
  const cleanedSections =
    Array.isArray(sections) &&
    sections.filter(
      (s) => typeof s === 'object' && s !== null && KNOWN_SECTION_TYPES.has((s as { component?: unknown }).component as string),
    );
  const needsSectionsFix = cleanedSections !== false && cleanedSections.length !== sections?.length;

  const needsStatusFix = typeof item?.status === 'string' && !KNOWN_STATUSES.has(item.status);

  if (!needsSectionsFix && !needsStatusFix) return BusinessSchema.parse(raw);

  return BusinessSchema.parse({
    ...item,
    ...(needsSectionsFix ? { websiteSections: { ...item.websiteSections, sections: cleanedSections } } : {}),
    ...(needsStatusFix ? { status: 'pending' satisfies BusinessStatus } : {}),
  });
}

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
    const items = (result.Items ?? []).map((item) => parseBusinessItem(item));
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
      const business = parseBusinessItem(raw);
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
  return parseBusinessItem(result.Item);
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
  return parseBusinessItem(items[0]);
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
  return parseBusinessItem(items[0]);
}

/**
 * Retrieve a single business by Stripe Subscription ID using the
 * stripe-subscription-id-index GSI (Stage 18). The webhook handler's
 * primary Business lookup when an event references a subscription ID —
 * a sparse, high-cardinality index, deliberately not `Business.status`-like
 * low-cardinality.
 */
export async function getBusinessByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Business | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_BUSINESSES(),
      IndexName: 'stripe-subscription-id-index',
      KeyConditionExpression: 'stripeSubscriptionId = :stripeSubscriptionId',
      ExpressionAttributeValues: { ':stripeSubscriptionId': stripeSubscriptionId },
      Limit: 1,
    }),
  );
  const items = result.Items ?? [];
  if (items.length === 0) return null;
  return parseBusinessItem(items[0]);
}

/**
 * Retrieve every business owned by a given customer (Cognito `sub`), newest
 * claim first, via the `owner-user-id-index` GSI (Stage 17). Not unique per
 * user by design — one customer account may own multiple Businesses; there
 * is no one-account-one-business restriction (see implementation.md, Stage
 * 17, "Ownership model").
 */
export async function getBusinessesByOwnerUserId(ownerUserId: string): Promise<Business[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_BUSINESSES(),
      IndexName: 'owner-user-id-index',
      KeyConditionExpression: 'ownerUserId = :ownerUserId',
      ExpressionAttributeValues: { ':ownerUserId': ownerUserId },
      ScanIndexForward: false,
    }),
  );
  return (result.Items ?? []).map((item) => parseBusinessItem(item));
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
        // Defensive: this table must never carry a non-Business item shape
        // (e.g. a rate-limit counter) the way leads/claims safely do — this
        // scan, unlike a targeted GetItem/Query, would try to parse one as a
        // Business and throw. `slug` is a required field only a real
        // Business row ever has, so this filter is a no-op today and only
        // matters if that invariant is ever violated again.
        FilterExpression: 'attribute_exists(slug)',
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const item of result.Items ?? []) {
      items.push(parseBusinessItem(item));
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

/**
 * Admin-only ownership recovery (Stage 17): clears `ownerUserId`/`claimedAt`
 * on a claimed business, without touching the original (terminal, historical)
 * `Claim` record. An exceptional operation, not a customer-facing feature —
 * ownership never expires automatically; this is the only way to reopen a
 * business for a fresh claim after one was made in error or abandoned. The
 * admin is expected to issue a new claim/token afterward via the existing
 * claim-link generation action.
 *
 * Returns `false` (never throws) when the business is already unclaimed,
 * matching the conditional-update convention used throughout this codebase.
 */
export async function releaseOwnership(businessId: string): Promise<boolean> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  try {
    await client.send(
      new UpdateCommand({
        TableName: TABLE_BUSINESSES(),
        Key: { businessId },
        UpdateExpression: 'REMOVE ownerUserId, claimedAt SET updatedAt = :now',
        ConditionExpression: 'attribute_exists(ownerUserId)',
        ExpressionAttributeValues: { ':now': now },
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

type AdvanceableBusinessStatus = 'outreach' | 'engaged' | 'claimed';

/**
 * Every status value the target may legally advance from — encodes the
 * funnel's forward-only rank order (see `BUSINESS_STATUSES`'s doc comment).
 * `customer`/`cancelled` deliberately never appear in any list here: a
 * business already at either one makes every one of these conditions fail,
 * which is what makes this helper self-guarding against ever regressing a
 * paying (or formerly paying) customer back to an earlier funnel stage.
 */
const ADVANCE_ALLOWED_PRIOR: Record<AdvanceableBusinessStatus, BusinessStatus[]> = {
  outreach: ['pending'],
  engaged: ['pending', 'outreach'],
  claimed: ['pending', 'outreach', 'engaged'],
};

/**
 * Advances a business's funnel `status` forward by one step, only if its
 * current status is still behind `target` — a race-safe, conditional write
 * so the three independent trigger call sites (postcard submission, a
 * campaign-code scan, claim consumption) can never regress a business that
 * another trigger has already moved further along, and repeat events
 * (re-mailing, re-scanning) are harmless no-ops.
 *
 * Returns `false` (never throws) when the condition doesn't hold — already
 * at or past `target` — matching `releaseOwnership`'s conditional-update
 * convention. Bypasses `updateBusiness()` deliberately: that function has no
 * `ConditionExpression` and does a read-then-write, which isn't race-safe
 * here.
 */
export async function advanceBusinessStatus(businessId: string, target: AdvanceableBusinessStatus): Promise<boolean> {
  const allowedPrior = ADVANCE_ALLOWED_PRIOR[target];
  const client = getDynamoDBClient();
  const now = new Date().toISOString();

  const priorValueAliases = allowedPrior.map((_, i) => `:prior${i}`);
  const expressionAttributeValues: Record<string, unknown> = { ':target': target, ':now': now };
  allowedPrior.forEach((status, i) => {
    expressionAttributeValues[`:prior${i}`] = status;
  });

  try {
    await client.send(
      new UpdateCommand({
        TableName: TABLE_BUSINESSES(),
        Key: { businessId },
        UpdateExpression: 'SET #status = :target, updatedAt = :now',
        ConditionExpression: `#status IN (${priorValueAliases.join(', ')})`,
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: expressionAttributeValues,
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
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
