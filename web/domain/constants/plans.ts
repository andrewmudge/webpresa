/**
 * Stage 18 — Stripe Subscriptions.
 *
 * `WebpresaPlan` is the application's own plan identity — never a Stripe
 * Price ID. Price IDs can be rotated/reconfigured in the Stripe Dashboard
 * without changing what a customer conceptually bought; the mapping from
 * plan to Price ID lives server-side only (see `lib/stripe/plans.ts`).
 */
export const WEBPRESA_PLANS = ['basic', 'growth'] as const;
export type WebpresaPlan = (typeof WEBPRESA_PLANS)[number];

/** Billing cadence a Checkout Session is created for — see `lib/stripe/plans.ts`'s `resolvePriceId()`. */
export const BILLING_INTERVALS = ['monthly', 'annual'] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

/**
 * Application-owned subscription lifecycle — the only status most of the
 * app should ever branch on. Stripe's own raw status (~9 values, including
 * ones Webpresa never intentionally produces, like `trialing`) is retained
 * separately on `Business.stripeRawStatus` for diagnostics only.
 */
export const SUBSCRIPTION_STATUSES = ['active', 'past_due', 'canceled'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/**
 * Tags every Checkout Session/Subscription this platform creates with what
 * it's actually for. Stage 18 only ever creates `'website_subscription'`
 * charges — `'domain_purchase'`/`'domain_renewal'` are reserved for a future
 * onboarding stage that will share the same `CustomerBillingProfile` Stripe
 * Customer. The Stage 18 webhook handler ignores anything not tagged
 * `'website_subscription'`, so a future domain charge can never be
 * misread as a website-subscription event.
 */
export const BILLING_PURPOSES = ['website_subscription', 'domain_purchase', 'domain_renewal'] as const;
export type BillingPurpose = (typeof BILLING_PURPOSES)[number];
