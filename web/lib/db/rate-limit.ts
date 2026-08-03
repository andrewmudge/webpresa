import 'server-only';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient } from './client';

/**
 * Shared fixed-window rate-limit-counter implementation, extracted from
 * Stage 17's `claims.ts` (which introduced the pattern: a distinct
 * `RATELIMIT#<key>#<windowBucket>` item shape folded into an existing
 * table, rather than a dedicated rate-limit table) so Stage 20's `leads.ts`
 * doesn't carry a second, independently-drifting copy of a
 * security-sensitive function. Table-agnostic — the caller supplies which
 * table's partition key the counter item lives under.
 */

/** Builds a table's partition-key value for a rate-limit counter item. */
export function buildRateLimitKey(scope: string, windowBucket: string): string {
  return `RATELIMIT#${scope}#${windowBucket}`;
}

export interface RateLimitCheckParams {
  tableName: string;
  /** The name of the table's partition-key attribute (e.g. `claimId`, `leadId`). */
  partitionKeyName: string;
  /** The partition-key value — see `buildRateLimitKey`. */
  bucketKey: string;
  limit: number;
  /** Epoch seconds when DynamoDB TTL should clean up this counter item. */
  ttlEpochSeconds: number;
}

/**
 * Conditionally increments a fixed-window rate-limit counter. Returns
 * `false` (never throws) once the window's limit is reached — callers
 * treat that identically to any other invalid-submission response, never
 * surfacing a distinct "rate limited" message.
 *
 * The condition is `attribute_not_exists(#count) OR #count < :limit`, not a
 * bare `#count < :limit` — the first request in a new window must *create*
 * the counter item, and referencing `#count` in a condition before it
 * exists would otherwise throw instead of succeed.
 */
export async function checkAndIncrementRateLimit(params: RateLimitCheckParams): Promise<boolean> {
  const { tableName, partitionKeyName, bucketKey, limit, ttlEpochSeconds } = params;
  const client = getDynamoDBClient();

  try {
    await client.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { [partitionKeyName]: bucketKey },
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
