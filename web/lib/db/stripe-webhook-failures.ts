import 'server-only';
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { StripeWebhookFailure } from '@/domain/models/stripe-webhook-failure';
import { StripeWebhookFailureSchema } from '@/domain/schemas/stripe-webhook-failure.schema';
import { getDynamoDBClient, TABLE_STRIPE_WEBHOOK_FAILURES } from './client';

/** Records one failed Stripe webhook delivery — see `domain/models/stripe-webhook-failure.ts`. */
export async function putStripeWebhookFailure(failure: StripeWebhookFailure): Promise<void> {
  StripeWebhookFailureSchema.parse(failure);
  const client = getDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_STRIPE_WEBHOOK_FAILURES(),
      Item: failure,
    }),
  );
}

/**
 * Recent Stripe webhook failures, newest first, for the Operations page's
 * "Needs Attention" aggregation. This table is TTL-bounded (~90 days) and
 * write-rare (failures only), so a plain bounded `Scan` is cheap in
 * practice — no GSI is provisioned, matching `listAllScans`'s documented
 * dev-scale tradeoff for the same shape of query.
 */
const LIST_RECENT_SAFETY_CAP_PAGES = 10;

export async function listRecentStripeWebhookFailures(): Promise<StripeWebhookFailure[]> {
  const client = getDynamoDBClient();
  const items: StripeWebhookFailure[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  let pages = 0;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: TABLE_STRIPE_WEBHOOK_FAILURES(),
        Limit: 200,
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const item of result.Items ?? []) {
      items.push(StripeWebhookFailureSchema.parse(item));
    }
    exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    pages += 1;
  } while (exclusiveStartKey && pages < LIST_RECENT_SAFETY_CAP_PAGES);

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
