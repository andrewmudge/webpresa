import type { StripeWebhookFailure } from '@/domain/models/stripe-webhook-failure';
import { StripeWebhookFailureSchema } from '@/domain/schemas/stripe-webhook-failure.schema';
import { generateId, nowIso } from './utils';

/** Diagnostics-only — see `domain/models/stripe-webhook-failure.ts`. Bounded to ~90 days via TTL, unlike Lob's permanent webhook-event history. */
const TTL_SECONDS = 90 * 24 * 60 * 60;

export interface CreateStripeWebhookFailureInput {
  eventId?: string;
  eventType?: string;
  businessId?: string;
  errorCategory: string;
  errorMessage: string;
}

/**
 * Create a new StripeWebhookFailure record — written only on the two Stripe
 * webhook failure paths (invalid signature, processing error), never on a
 * successfully processed event.
 */
export function createStripeWebhookFailure(input: CreateStripeWebhookFailureInput): StripeWebhookFailure {
  const now = nowIso();
  const nowSeconds = Math.floor(Date.now() / 1000);

  const record: StripeWebhookFailure = {
    id: generateId('stripefail_'),
    ...(input.eventId !== undefined && { eventId: input.eventId }),
    ...(input.eventType !== undefined && { eventType: input.eventType }),
    ...(input.businessId !== undefined && { businessId: input.businessId }),
    errorCategory: input.errorCategory,
    errorMessage: input.errorMessage,
    ttl: nowSeconds + TTL_SECONDS,
    createdAt: now,
  };

  StripeWebhookFailureSchema.parse(record);
  return record;
}
