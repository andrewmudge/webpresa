import 'server-only';
import { WEBPRESA_PLANS, type WebpresaPlan } from '@/domain/constants/plans';

/**
 * Server-side Stripe Price ID mapping (Stage 18).
 *
 * Price IDs are not secret credentials, but they remain server-controlled
 * to prevent arbitrary-price Checkout requests — the browser only ever
 * submits a `WebpresaPlan` string, validated against `WEBPRESA_PLANS`
 * before this function is called; there is no code path from browser input
 * to a raw Stripe Price ID. Kept as plain (non-secret) environment
 * variables rather than in the Stripe Secrets Manager secret, matching the
 * existing pattern of non-secret, environment-specific configuration used
 * elsewhere in this codebase (deterministic secret/table names, etc.).
 */
const PRICE_ID_ENV_VARS: Record<WebpresaPlan, string> = {
  basic: 'STRIPE_PRICE_ID_BASIC',
  growth: 'STRIPE_PRICE_ID_GROWTH',
};

export function resolvePriceId(plan: WebpresaPlan): string {
  const envVar = PRICE_ID_ENV_VARS[plan];
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
 * Stripe Dashboard edit). Returns `undefined` for an unrecognized Price ID
 * rather than throwing — reconciliation logs and skips the `plan` field
 * rather than failing the whole webhook on an unmapped price.
 */
export function resolvePlanFromPriceId(priceId: string): WebpresaPlan | undefined {
  return WEBPRESA_PLANS.find((plan) => process.env[PRICE_ID_ENV_VARS[plan]] === priceId);
}
