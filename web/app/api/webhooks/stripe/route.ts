import type Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe/client';
import { getStripeSecret } from '@/lib/secrets';
import { mapStripeSubscriptionToAppState, deriveBusinessStatusFromSubscriptionStatus } from '@/lib/stripe/status-mapping';
import { extractBusinessId, extractBillingPurpose } from '@/lib/stripe/metadata';
import { getBusinessById, getBusinessByStripeSubscriptionId, updateBusiness } from '@/lib/db/businesses';
import { log } from '@/lib/logging/log';
import { createStripeWebhookFailure } from '@/domain/factories/stripe-webhook-failure.factory';
import { putStripeWebhookFailure } from '@/lib/db/stripe-webhook-failures';

/**
 * Stripe webhook Route Handler (Stage 18) — the first Route Handler in this
 * repo needing raw-body access. See implementation.md, Stage 18, "Webhook
 * workflow", and architecture.md, "Stripe Subscriptions (Stage 18)".
 *
 * Reconciliation is snapshot-first, not event-order-first: every relevant
 * event triggers a fresh `stripe.subscriptions.retrieve()` call, and that
 * current object — never the embedded event payload, never `event.created`
 * ordering — is the sole authority for what gets written. This makes
 * duplicate and out-of-order delivery safe by construction: writing the
 * same current truth twice (or slightly out of order) is a no-op, not a
 * regression. `lastStripeEventId`/`lastStripeEventAt`/`lastStripeSyncAt` are
 * recorded for diagnostics only and never gate whether a write is applied.
 */

const ALLOWED_EVENT_TYPES = new Set<string>([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]);

interface ResolvedEventTarget {
  subscriptionId?: string;
  metadata?: Stripe.Metadata | null;
}

/**
 * Resolves the Stripe Subscription ID and the trusted metadata carried by
 * this event's underlying object — the shape differs per event type (a
 * Checkout Session, a Subscription, or an Invoice via its subscription
 * "parent").
 */
function resolveEventTarget(event: Stripe.Event): ResolvedEventTarget {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as unknown as Stripe.Checkout.Session;
      const subscription = session.subscription;
      const subscriptionId = typeof subscription === 'string' ? subscription : subscription?.id;
      return { subscriptionId, metadata: session.metadata };
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as unknown as Stripe.Subscription;
      return { subscriptionId: subscription.id, metadata: subscription.metadata };
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as unknown as Stripe.Invoice;
      const subscriptionDetails = invoice.parent?.subscription_details;
      const subscription = subscriptionDetails?.subscription;
      const subscriptionId = typeof subscription === 'string' ? subscription : subscription?.id;
      return { subscriptionId, metadata: subscriptionDetails?.metadata };
    }
    default:
      return {};
  }
}

/**
 * Stage 24 — best-effort write of a `StripeWebhookFailure` diagnostic
 * record (see `domain/models/stripe-webhook-failure.ts`). Never throws —
 * losing the diagnostic record must never turn an otherwise-handled webhook
 * failure into a second, unrelated failure.
 */
async function recordFailure(input: { errorCategory: string; errorMessage: string; eventId?: string; eventType?: string; businessId?: string }): Promise<void> {
  try {
    await putStripeWebhookFailure(createStripeWebhookFailure(input));
  } catch (err) {
    log({ level: 'error', event: 'stripe.webhook.failure_record_write_failed', message: err instanceof Error ? err.message : 'unknown' });
  }
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text(); // raw, unparsed — required for signature verification
  const signature = request.headers.get('stripe-signature');

  const stripe = await getStripeClient();
  const { webhookSecret } = await getStripeSecret();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature ?? '', webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    log({ level: 'warn', event: 'stripe.webhook.invalid_signature', message, component: 'stripe-webhook' });
    await recordFailure({ errorCategory: 'invalid_signature', errorMessage: message });
    return new Response('Invalid signature', { status: 400 });
  }

  if (!ALLOWED_EVENT_TYPES.has(event.type)) {
    return new Response(null, { status: 200 }); // acknowledged, intentionally ignored
  }

  const { subscriptionId, metadata } = resolveEventTarget(event);

  // A future domain-purchase/renewal charge (sharing the same
  // CustomerBillingProfile Stripe Customer) must never be misread as a
  // website-subscription event.
  const billingPurpose = extractBillingPurpose(metadata);
  if (billingPurpose && billingPurpose !== 'website_subscription') {
    log({ event: 'stripe.webhook.ignored_purpose', component: 'stripe-webhook', operation: event.type, message: billingPurpose });
    return new Response(null, { status: 200 });
  }

  let businessId = extractBusinessId(metadata);
  if (!businessId && subscriptionId) {
    const businessBySubscription = await getBusinessByStripeSubscriptionId(subscriptionId);
    businessId = businessBySubscription?.businessId;
  }

  if (!businessId) {
    // Do not 500 — Stripe would retry forever on a permanently unresolvable event.
    log({ level: 'warn', event: 'stripe.webhook.unresolved_business', component: 'stripe-webhook', operation: event.type });
    return new Response(null, { status: 200 });
  }

  const business = await getBusinessById(businessId);
  if (!business) {
    log({ level: 'warn', event: 'stripe.webhook.unknown_business', component: 'stripe-webhook', businessId });
    return new Response(null, { status: 200 });
  }

  if (!subscriptionId) {
    log({ level: 'warn', event: 'stripe.webhook.no_subscription_id', component: 'stripe-webhook', operation: event.type, businessId });
    return new Response(null, { status: 200 });
  }

  try {
    // Always re-fetch the CURRENT subscription from Stripe — the fetched
    // object is the authority, not the embedded event payload.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const mapped = mapStripeSubscriptionToAppState(subscription);
    const derivedStatus = deriveBusinessStatusFromSubscriptionStatus(mapped.subscriptionStatus);

    await updateBusiness(businessId, {
      ...(mapped.subscriptionStatus !== undefined ? { subscriptionStatus: mapped.subscriptionStatus } : {}),
      ...(derivedStatus !== undefined ? { status: derivedStatus } : {}),
      stripeRawStatus: mapped.stripeRawStatus,
      stripeSubscriptionId: mapped.stripeSubscriptionId,
      ...(mapped.currentPeriodEnd !== undefined ? { currentPeriodEnd: mapped.currentPeriodEnd } : {}),
      cancelAtPeriodEnd: mapped.cancelAtPeriodEnd,
      ...(mapped.plan !== undefined ? { plan: mapped.plan } : {}),
      ...(mapped.billingInterval !== undefined ? { billingInterval: mapped.billingInterval } : {}),
      // Stage 29 (Analytics) — set once (never overwritten on a later
      // resubscribe) / on each cancellation. See Business.firstPaidAt/
      // canceledAt doc comments for the exact semantics these two fields
      // carry and why they're diagnostic-adjacent but not gated writes.
      ...(mapped.subscriptionStatus === 'active' && !business.firstPaidAt ? { firstPaidAt: new Date().toISOString() } : {}),
      ...(derivedStatus === 'cancelled' ? { canceledAt: new Date().toISOString() } : {}),
      lastStripeEventId: event.id,
      lastStripeEventAt: new Date(event.created * 1000).toISOString(),
      lastStripeSyncAt: new Date().toISOString(),
    });

    log({ event: 'stripe.webhook.processed', component: 'stripe-webhook', operation: event.type, businessId, status: mapped.subscriptionStatus });
    return new Response(null, { status: 200 });
  } catch (err) {
    // Unexpected internal error (DynamoDB/Stripe API failure) — 500 so
    // Stripe retries per its standard backoff.
    const message = err instanceof Error ? err.message : 'unknown';
    log({ level: 'error', event: 'stripe.webhook.processing_failed', component: 'stripe-webhook', operation: event.type, businessId, message });
    await recordFailure({ errorCategory: 'processing_failed', errorMessage: message, eventId: event.id, eventType: event.type, businessId });
    return new Response(null, { status: 500 });
  }
}
