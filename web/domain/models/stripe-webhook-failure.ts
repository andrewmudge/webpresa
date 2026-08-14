import type { TimestampedRecord } from './common';

/**
 * A single, TTL-bounded record of one failed Stripe webhook delivery (Stage
 * 24) — diagnostics only, not a full event mirror. Unlike Lob's permanent
 * `PostcardWebhookEvent` history (every delivery, kept forever, feeding a
 * per-postcard timeline), Stripe webhook processing has no durable record of
 * any kind today: reconciliation is snapshot-first (a fresh
 * `stripe.subscriptions.retrieve()` call is the sole authority — see
 * `app/api/webhooks/stripe/route.ts`), and `Business.lastStripeEventId`/
 * `lastStripeEventAt`/`lastStripeSyncAt` are explicitly diagnostics-only,
 * never gating a write. That leaves a failed/malformed Stripe webhook
 * invisible outside raw logs.
 *
 * This record exists only to make that one gap visible on
 * `/admin/operations` — it is written on the two failure paths (invalid
 * signature, processing error), never on a successfully processed event,
 * and never stores the raw request body or signature. `ttl` bounds it to a
 * short diagnostic window (see `createStripeWebhookFailure`) rather than
 * accumulating forever like Lob's table.
 */
export interface StripeWebhookFailure extends TimestampedRecord {
  /** DynamoDB table partition key. Format: `stripefail_<uuid>` */
  id: string;
  /** Stripe's own event id, when the failure occurred after signature verification. */
  eventId?: string;
  eventType?: string;
  /** Resolved only when known — a signature failure has no event yet, so no business. */
  businessId?: string;
  /** Coarse category: 'invalid_signature' | 'processing_failed' | ... */
  errorCategory: string;
  /** Safe, admin-facing summary — never the raw Stripe error object or stack trace. */
  errorMessage: string;
  /** Epoch seconds — DynamoDB TTL attribute, ~90 days out from creation. */
  ttl: number;
}
