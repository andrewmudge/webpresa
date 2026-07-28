import 'server-only';
import { ConditionalCheckFailedException, TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { Claim } from '@/domain/models/claim';
import { ClaimSchema } from '@/domain/schemas/claim.schema';
import { getDynamoDBClient, TABLE_CLAIMS, TABLE_BUSINESSES } from './client';

// ---------------------------------------------------------------------------
// Pure predicates
// ---------------------------------------------------------------------------

/**
 * Whether a claim can still be used to start `/claim/continue` — `issued`
 * and not yet past `expiresAt`. A plain, side-effect-free predicate (no
 * lazy-expiry write) — factored out so callers that need this check inside
 * a Server Component don't call `Date.now()` inline there themselves (React's
 * purity lint rule flags impure calls made directly in component bodies).
 */
export function isClaimUsable(claim: Pick<Claim, 'status' | 'expiresAt'>): boolean {
  return claim.status === 'issued' && new Date(claim.expiresAt).getTime() >= Date.now();
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getClaimById(claimId: string): Promise<Claim | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_CLAIMS(),
      Key: { claimId },
    }),
  );
  if (!result.Item) return null;
  return ClaimSchema.parse(result.Item);
}

async function getClaimByTokenHash(tokenHash: string): Promise<Claim | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_CLAIMS(),
      IndexName: 'token-hash-index',
      KeyConditionExpression: 'tokenHash = :tokenHash',
      ExpressionAttributeValues: { ':tokenHash': tokenHash },
      Limit: 1,
    }),
  );
  const items = result.Items ?? [];
  if (items.length === 0) return null;
  return ClaimSchema.parse(items[0]);
}

/**
 * Resolve a claim by its token hash, lazily transitioning `issued` → `expired`
 * when `expiresAt` has passed. Expiration is a status transition, never a
 * DynamoDB TTL deletion — claim history must be preserved indefinitely (see
 * implementation.md, Stage 17, "Claim-token requirements").
 *
 * The transition itself is conditional (`status = 'issued'`), so a concurrent
 * consumption always wins the race rather than being silently clobbered by
 * this lazy check — on a lost race, the claim is re-read and returned as-is.
 */
export async function getClaimByTokenHashWithLazyExpiry(tokenHash: string): Promise<Claim | null> {
  const claim = await getClaimByTokenHash(tokenHash);
  if (!claim) return null;
  if (claim.status !== 'issued') return claim;
  if (new Date(claim.expiresAt).getTime() >= Date.now()) return claim;

  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  try {
    await client.send(
      new UpdateCommand({
        TableName: TABLE_CLAIMS(),
        Key: { claimId: claim.claimId },
        UpdateExpression: 'SET #status = :expired, updatedAt = :now',
        ConditionExpression: '#status = :issued',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':expired': 'expired', ':issued': 'issued', ':now': now },
      }),
    );
    return { ...claim, status: 'expired', updatedAt: now };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      return getClaimById(claim.claimId);
    }
    throw err;
  }
}

/**
 * List every claim ever issued for a business, newest first — the admin
 * claim-history view. Never filtered or paginated away; claim records are
 * never deleted by normal operation (see `deleteBusinessAction`'s cascade in
 * the admin actions for the one explicit, admin-destructive exception).
 */
export async function listClaimsForBusiness(businessId: string): Promise<Claim[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_CLAIMS(),
      IndexName: 'business-id-index',
      KeyConditionExpression: 'businessId = :businessId',
      ExpressionAttributeValues: { ':businessId': businessId },
      ScanIndexForward: false,
    }),
  );
  return (result.Items ?? []).map((item) => ClaimSchema.parse(item));
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function putClaim(claim: Claim): Promise<void> {
  ClaimSchema.parse(claim);
  const client = getDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_CLAIMS(),
      Item: claim,
    }),
  );
}

/**
 * Revoke an `issued` claim. Only permitted from `status='issued'` — a
 * consumed, expired, or already-revoked claim is a terminal state and cannot
 * be revoked. Returns `false` (never throws) when the condition fails,
 * matching `claimScanExecutionStatus`'s convention (`lib/db/scan-executions.ts`).
 */
export async function revokeClaim(claimId: string, reason?: string): Promise<boolean> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  try {
    await client.send(
      new UpdateCommand({
        TableName: TABLE_CLAIMS(),
        Key: { claimId },
        UpdateExpression:
          'SET #status = :revoked, revokedAt = :now, updatedAt = :now' +
          (reason ? ', revokedReason = :reason' : ''),
        ConditionExpression: '#status = :issued',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':revoked': 'revoked',
          ':issued': 'issued',
          ':now': now,
          ...(reason ? { ':reason': reason } : {}),
        },
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

export async function deleteClaimById(claimId: string): Promise<void> {
  const client = getDynamoDBClient();
  await client.send(
    new DeleteCommand({
      TableName: TABLE_CLAIMS(),
      Key: { claimId },
    }),
  );
}

// ---------------------------------------------------------------------------
// Claim consumption + ownership reservation — the exactly-once transaction
// ---------------------------------------------------------------------------

export interface ConsumeClaimParams {
  claimId: string;
  businessId: string;
  /** Cognito `sub` of the authenticated customer. */
  userId: string;
}

export type ConsumeClaimResult =
  /** The transaction committed — this call is the one that reserved ownership. */
  | { outcome: 'consumed' }
  /** The same user had already consumed this exact claim (a double-submit) — idempotent success, not an error. */
  | { outcome: 'already_consumed_by_user' }
  /** The claim was already consumed by someone else, expired, revoked, or the business already has a different owner. */
  | { outcome: 'conflict' };

/**
 * Atomically consume a claim and reserve ownership of its business in one
 * `TransactWriteItems` call — this codebase's first cross-table transaction,
 * justified specifically by the "exactly once, across two items" requirement
 * (see implementation.md, Stage 17, "Detailed workflow").
 *
 * Both conditions must hold or the whole transaction cancels:
 *   - Claims: `status = 'issued' AND expiresAt > now`
 *   - Businesses: `attribute_not_exists(ownerUserId)`
 *
 * On cancellation, the Claims item is re-read to distinguish "this exact user
 * already consumed it" (safe to treat as success — a double-submit) from any
 * other conflict (someone else won the race, or the token expired/was
 * revoked between validation and submission).
 */
export async function consumeClaim(params: ConsumeClaimParams): Promise<ConsumeClaimResult> {
  const { claimId, businessId, userId } = params;
  const client = getDynamoDBClient();
  const now = new Date().toISOString();

  try {
    await client.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: TABLE_CLAIMS(),
              Key: { claimId },
              UpdateExpression:
                'SET #status = :consumed, consumedByUserId = :userId, consumedAt = :now, updatedAt = :now',
              ConditionExpression: '#status = :issued AND expiresAt > :now',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: {
                ':consumed': 'consumed',
                ':issued': 'issued',
                ':userId': userId,
                ':now': now,
              },
            },
          },
          {
            Update: {
              TableName: TABLE_BUSINESSES(),
              Key: { businessId },
              UpdateExpression: 'SET ownerUserId = :userId, claimedAt = :now, updatedAt = :now',
              ConditionExpression: 'attribute_not_exists(ownerUserId)',
              ExpressionAttributeValues: {
                ':userId': userId,
                ':now': now,
              },
            },
          },
        ],
      }),
    );
    return { outcome: 'consumed' };
  } catch (err) {
    if (err instanceof TransactionCanceledException) {
      const existing = await getClaimById(claimId);
      if (existing?.status === 'consumed' && existing.consumedByUserId === userId) {
        return { outcome: 'already_consumed_by_user' };
      }
      return { outcome: 'conflict' };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Rate limiting — a distinct item shape in this same table, not a dedicated
// table (see implementation.md, Stage 17, "Claim-token requirements"). Real
// Claim records never populate `count`/`ttl`, so DynamoDB TTL cleanup of
// these counter items never touches claim history.
// ---------------------------------------------------------------------------

/** Builds the Claims-table partition-key value for a rate-limit counter item. */
export function buildRateLimitKey(ipHash: string, windowBucket: string): string {
  return `RATELIMIT#${ipHash}#${windowBucket}`;
}

export interface RateLimitCheckParams {
  /** The Claims-table partition-key value — see `buildRateLimitKey`. */
  bucketKey: string;
  limit: number;
  /** Epoch seconds when DynamoDB TTL should clean up this counter item. */
  ttlEpochSeconds: number;
}

/**
 * Conditionally increments a fixed-window rate-limit counter. Returns
 * `false` (never throws) once the window's limit is reached — the caller
 * treats that identically to any other invalid-claim response, never
 * surfacing a distinct "rate limited" message.
 *
 * The condition is `attribute_not_exists(#count) OR #count < :limit`, not a
 * bare `#count < :limit` — the first request in a new window must *create*
 * the counter item, and referencing `#count` in a condition before it exists
 * would otherwise throw instead of succeed. Mirrors the conditional-update
 * idiom already established by `claimScanExecutionStatus`
 * (`lib/db/scan-executions.ts`).
 */
export async function checkAndIncrementRateLimit(params: RateLimitCheckParams): Promise<boolean> {
  const { bucketKey, limit, ttlEpochSeconds } = params;
  const client = getDynamoDBClient();

  try {
    await client.send(
      new UpdateCommand({
        TableName: TABLE_CLAIMS(),
        Key: { claimId: bucketKey },
        UpdateExpression:
          'ADD #count :incr SET #ttl = if_not_exists(#ttl, :ttl), windowStart = if_not_exists(windowStart, :now)',
        ConditionExpression: 'attribute_not_exists(#count) OR #count < :limit',
        ExpressionAttributeNames: { '#count': 'count', '#ttl': 'ttl' },
        ExpressionAttributeValues: {
          ':incr': 1,
          ':limit': limit,
          ':ttl': ttlEpochSeconds,
          ':now': new Date().toISOString(),
        },
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}
