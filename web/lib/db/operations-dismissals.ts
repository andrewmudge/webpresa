import 'server-only';
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient, TABLE_OPERATIONS_DISMISSALS } from './client';

/**
 * Stage 24 — admin "Dismiss" action for `/admin/operations`'s Needs
 * Attention list. A dismiss is a snooze, not a delete: it never touches the
 * underlying `ScanEvent`/`ScanExecution`/`Postcard`/`Lead`/
 * `StripeWebhookFailure` record, so nothing here can destroy business/scan
 * history — it only controls what the Needs Attention aggregation shows
 * (see `lib/operations/needs-attention.ts`). Not a first-class domain
 * record — no Zod schema/factory, same "table-agnostic utility item"
 * treatment `lib/db/rate-limit.ts` already established for this repo's
 * other non-domain DynamoDB item shapes.
 *
 * `itemId` matches `NeedsAttentionItem.id` exactly (e.g.
 * `"scan:scan_abc123"`, `"postcard:postcard_xyz:submission"`).
 */

const DISMISSAL_TTL_SECONDS = 30 * 24 * 60 * 60;

export async function dismissNeedsAttentionItem(itemId: string, dismissedBy: string): Promise<void> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  await client.send(
    new PutCommand({
      TableName: TABLE_OPERATIONS_DISMISSALS(),
      Item: {
        itemId,
        dismissedAt: now,
        dismissedBy,
        ttl: Math.floor(Date.now() / 1000) + DISMISSAL_TTL_SECONDS,
      },
    }),
  );
}

/**
 * Every currently-dismissed item id. A plain bounded `Scan` projecting only
 * `itemId` — this table stays small by construction (TTL-bounded, and only
 * ever as large as the admin's own dismiss clicks), so this is cheap in
 * practice, the same dev-scale reasoning already applied elsewhere in this
 * app for small/write-rare tables.
 */
const LIST_DISMISSED_SAFETY_CAP_PAGES = 10;

export async function listDismissedItemIds(): Promise<Set<string>> {
  const client = getDynamoDBClient();
  const ids = new Set<string>();
  let exclusiveStartKey: Record<string, unknown> | undefined;
  let pages = 0;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: TABLE_OPERATIONS_DISMISSALS(),
        ProjectionExpression: 'itemId',
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const item of result.Items ?? []) {
      if (typeof item.itemId === 'string') ids.add(item.itemId);
    }
    exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    pages += 1;
  } while (exclusiveStartKey && pages < LIST_DISMISSED_SAFETY_CAP_PAGES);

  return ids;
}
