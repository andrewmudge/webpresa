import 'server-only';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { ScanHit } from '@/domain/models/scan-hit';
import { ScanHitSchema } from '@/domain/schemas/scan-hit.schema';
import { getDynamoDBClient, TABLE_SCAN_HITS } from './client';

export async function putScanHit(hit: ScanHit): Promise<void> {
  ScanHitSchema.parse(hit);
  const client = getDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_SCAN_HITS(),
      Item: hit,
    }),
  );
}

/** Most recent scans for one recipient, newest first — the admin "recent scans" view. */
export async function listRecentScanHitsForRecipient(campaignRecipientId: string, limit = 20): Promise<ScanHit[]> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_SCAN_HITS(),
      KeyConditionExpression: 'campaignRecipientId = :id AND begins_with(sortKey, :prefix)',
      ExpressionAttributeValues: { ':id': campaignRecipientId, ':prefix': 'HIT#' },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return (result.Items ?? []).map((item) => ScanHitSchema.parse(item));
}

/**
 * Atomically reserves a lifetime visitor-fingerprint for one recipient —
 * backs `CampaignRecipient.estimatedUniqueScans`. Returns `true` when this
 * is a new visitor (the reservation was newly created), `false` when
 * already seen.
 *
 * Unlike `leads`'/`claims`' own `FINGERPRINT#`/`RATELIMIT#` items, this
 * reservation is deliberately **never** TTL'd — those exist for short-window
 * abuse prevention and are meant to expire; this one backs a lifetime
 * "estimated unique scans" count and must persist for as long as the
 * recipient does (see implementation.md, Stage 21, "Infrastructure
 * changes").
 */
export async function reserveVisitorFingerprint(campaignRecipientId: string, visitorFingerprint: string): Promise<boolean> {
  const client = getDynamoDBClient();
  try {
    await client.send(
      new PutCommand({
        TableName: TABLE_SCAN_HITS(),
        Item: { campaignRecipientId, sortKey: `FINGERPRINT#${visitorFingerprint}` },
        ConditionExpression: 'attribute_not_exists(sortKey)',
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

/**
 * Admin/cascade-delete only (business deletion, campaign deletion) —
 * deletes every item this recipient owns in this table, both real
 * `ScanHit` rows and its permanent fingerprint reservations. Never called
 * during normal operation; `ScanHit`
 * history is otherwise preserved indefinitely.
 */
export async function deleteAllScanHitsForRecipient(campaignRecipientId: string): Promise<void> {
  const client = getDynamoDBClient();
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const result = await client.send(
      new QueryCommand({
        TableName: TABLE_SCAN_HITS(),
        KeyConditionExpression: 'campaignRecipientId = :id',
        ExpressionAttributeValues: { ':id': campaignRecipientId },
        ProjectionExpression: 'campaignRecipientId, sortKey',
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    const items = (result.Items ?? []) as { campaignRecipientId: string; sortKey: string }[];
    await Promise.all(
      items.map((item) =>
        client.send(
          new DeleteCommand({
            TableName: TABLE_SCAN_HITS(),
            Key: { campaignRecipientId: item.campaignRecipientId, sortKey: item.sortKey },
          }),
        ),
      ),
    );
    exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (exclusiveStartKey);
}
