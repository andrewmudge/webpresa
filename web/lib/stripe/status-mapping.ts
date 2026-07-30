import 'server-only';
import type Stripe from 'stripe';
import type { SubscriptionStatus, WebpresaPlan } from '@/domain/constants/plans';
import { resolvePlanFromPriceId } from './plans';

/**
 * Maps a Stripe subscription `status` to Webpresa's 3-value application
 * lifecycle. Returns `undefined` for statuses that should grant no
 * entitlement and leave `Business.subscriptionStatus` unset/unchanged
 * (`incomplete`/`incomplete_expired` — the first payment never succeeded).
 *
 * `trialing` maps to `undefined` (no entitlement), NOT `active` — Webpresa
 * never intentionally creates a Stripe trial (the generated preview is the
 * trial), so encountering one is a configuration anomaly to log, not a
 * state to grant paid access from. Granting entitlement on an unintended
 * trial would be a fail-open bug (free access), which is strictly worse
 * than fail-closed.
 */
export function mapStripeStatusToAppStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus | undefined {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'past_due':
    case 'unpaid':
    case 'paused':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'trialing':
    case 'incomplete':
    case 'incomplete_expired':
      return undefined;
    default:
      return undefined;
  }
}

export interface MappedSubscriptionState {
  subscriptionStatus?: SubscriptionStatus;
  stripeRawStatus: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  plan?: WebpresaPlan;
  stripeSubscriptionId: string;
}

/**
 * Reconciles a full Stripe Subscription object (always freshly re-fetched
 * from the Stripe API by the webhook handler, never trusted from only the
 * embedded event payload) into the fields Webpresa persists on `Business`.
 *
 * `currentPeriodEnd`/`cancelAtPeriodEnd` are recorded independently of the
 * status mapping — read from the subscription's first item, since
 * `current_period_end` lives per-item as of newer Stripe API versions
 * rather than on the subscription object itself.
 */
export function mapStripeSubscriptionToAppState(subscription: Stripe.Subscription): MappedSubscriptionState {
  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price?.id;
  const currentPeriodEndUnix = firstItem?.current_period_end;

  if (subscription.status === 'trialing') {
    logStripeAnomaly('trialing_subscription_encountered', {
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  }

  return {
    subscriptionStatus: mapStripeStatusToAppStatus(subscription.status),
    stripeRawStatus: subscription.status,
    currentPeriodEnd: currentPeriodEndUnix ? new Date(currentPeriodEndUnix * 1000).toISOString() : undefined,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    plan: priceId ? resolvePlanFromPriceId(priceId) : undefined,
    stripeSubscriptionId: subscription.id,
  };
}

/**
 * Safe, structured logging for Stripe reconciliation anomalies — never the
 * full Stripe object, just enough to investigate (see architecture.md,
 * "Stripe Subscriptions (Stage 18)").
 */
function logStripeAnomaly(event: string, context: Record<string, unknown>): void {
  console.warn(`[stripe] ${event}`, context);
}
