import type Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe/client';
import { getStripeSecret } from '@/lib/secrets';
import { mapStripeSubscriptionToAppState } from '@/lib/stripe/status-mapping';
import { extractBusinessId, extractBillingPurpose } from '@/lib/stripe/metadata';
import { getBusinessById, getBusinessByStripeSubscriptionId, updateBusiness } from '@/lib/db/businesses';

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

/** Structured, safe logging — never the full Stripe payload, never card/payment details. */
function logSafely(event: string, context: Record<string, unknown>): void {
  console.log(`[stripe webhook] ${event}`, context);
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
    logSafely('invalid_signature', { message: err instanceof Error ? err.message : 'unknown' });
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
    logSafely('ignored_purpose', { eventId: event.id, purpose: billingPurpose });
    return new Response(null, { status: 200 });
  }

  let businessId = extractBusinessId(metadata);
  if (!businessId && subscriptionId) {
    const businessBySubscription = await getBusinessByStripeSubscriptionId(subscriptionId);
    businessId = businessBySubscription?.businessId;
  }

  if (!businessId) {
    // Do not 500 — Stripe would retry forever on a permanently unresolvable event.
    logSafely('unresolved_business', { eventId: event.id, eventType: event.type });
    return new Response(null, { status: 200 });
  }

  const business = await getBusinessById(businessId);
  if (!business) {
    logSafely('unknown_business', { eventId: event.id, businessId });
    return new Response(null, { status: 200 });
  }

  if (!subscriptionId) {
    logSafely('no_subscription_id', { eventId: event.id, eventType: event.type, businessId });
    return new Response(null, { status: 200 });
  }

  try {
    // Always re-fetch the CURRENT subscription from Stripe — the fetched
    // object is the authority, not the embedded event payload.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const mapped = mapStripeSubscriptionToAppState(subscription);

    await updateBusiness(businessId, {
      ...(mapped.subscriptionStatus !== undefined ? { subscriptionStatus: mapped.subscriptionStatus } : {}),
      stripeRawStatus: mapped.stripeRawStatus,
      stripeSubscriptionId: mapped.stripeSubscriptionId,
      ...(mapped.currentPeriodEnd !== undefined ? { currentPeriodEnd: mapped.currentPeriodEnd } : {}),
      cancelAtPeriodEnd: mapped.cancelAtPeriodEnd,
      ...(mapped.plan !== undefined ? { plan: mapped.plan } : {}),
      lastStripeEventId: event.id,
      lastStripeEventAt: new Date(event.created * 1000).toISOString(),
      lastStripeSyncAt: new Date().toISOString(),
    });

    logSafely('processed', { eventId: event.id, eventType: event.type, businessId });
    return new Response(null, { status: 200 });
  } catch (err) {
    // Unexpected internal error (DynamoDB/Stripe API failure) — 500 so
    // Stripe retries per its standard backoff.
    console.error('[stripe webhook] processing_failed', { eventId: event.id, eventType: event.type, businessId, err });
    return new Response(null, { status: 500 });
  }
}
