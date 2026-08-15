import 'server-only';
import { WEBPRESA_PLANS, BILLING_INTERVALS, type WebpresaPlan, type BillingInterval } from '@/domain/constants/plans';

/**
 * Server-side Stripe Price ID mapping (Stage 18; annual pricing added
 * alongside the claim-status billing-interval toggle).
 *
 * Price IDs are not secret credentials, but they remain server-controlled
 * to prevent arbitrary-price Checkout requests — the browser only ever
 * submits a `WebpresaPlan`/`BillingInterval` pair, both validated against
 * their respective allowed-value lists before this function is called;
 * there is no code path from browser input to a raw Stripe Price ID. Kept
 * as plain (non-secret) environment variables rather than in the Stripe
 * Secrets Manager secret, matching the existing pattern of non-secret,
 * environment-specific configuration used elsewhere in this codebase
 * (deterministic secret/table names, etc.).
 */
const PRICE_ID_ENV_VARS: Record<WebpresaPlan, Record<BillingInterval, string>> = {
  basic: { monthly: 'STRIPE_PRICE_ID_BASIC', annual: 'STRIPE_PRICE_ID_BASIC_ANNUAL' },
  growth: { monthly: 'STRIPE_PRICE_ID_GROWTH', annual: 'STRIPE_PRICE_ID_GROWTH_ANNUAL' },
};

export function resolvePriceId(plan: WebpresaPlan, interval: BillingInterval = 'monthly'): string {
  const envVar = PRICE_ID_ENV_VARS[plan][interval];
  const id = process.env[envVar];
  if (!id) {
    throw new Error(`${envVar} environment variable is not set`);
  }
  return id;
}

/**
 * Reverse lookup — a Stripe Subscription's current Price ID back to a
 * `WebpresaPlan`, used by webhook reconciliation to detect and apply a plan
 * change (whether made via a future self-service Portal flow or a manual
 * Stripe Dashboard edit). Checks both billing intervals' Price IDs, since a
 * Subscription's plan (Basic/Growth) is what's reconciled here, not which
 * cadence it bills on. Returns `undefined` for an unrecognized Price ID
 * rather than throwing — reconciliation logs and skips the `plan` field
 * rather than failing the whole webhook on an unmapped price.
 */
export function resolvePlanFromPriceId(priceId: string): WebpresaPlan | undefined {
  return WEBPRESA_PLANS.find((plan) =>
    Object.values(PRICE_ID_ENV_VARS[plan]).some((envVar) => process.env[envVar] === priceId),
  );
}

/**
 * Reverse lookup — a Stripe Subscription's current Price ID back to the
 * `BillingInterval` it was purchased under. Sibling to `resolvePlanFromPriceId`
 * (same webhook reconciliation call site, same Price ID), but resolves the
 * cadence instead of the tier. Checks every plan's env var for each interval,
 * since the Price ID alone doesn't carry which plan it belongs to — same
 * "returns undefined rather than throwing" contract as `resolvePlanFromPriceId`.
 */
export function resolveBillingIntervalFromPriceId(priceId: string): BillingInterval | undefined {
  return BILLING_INTERVALS.find((interval) =>
    WEBPRESA_PLANS.some((plan) => process.env[PRICE_ID_ENV_VARS[plan][interval]] === priceId),
  );
}
