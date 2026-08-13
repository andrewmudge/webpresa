import 'server-only';
import Stripe from 'stripe';
import { getStripeSecret } from '@/lib/secrets';
import { assertLiveModeAllowed } from '@/lib/env/runtime-environment';

/**
 * Singleton Stripe client (Stage 18).
 *
 * Pins an explicit `apiVersion` rather than drifting with Stripe's
 * account-level default, matching the currently-installed `stripe` npm
 * package's own default version. Bump this deliberately on upgrade —
 * reviewing Stripe's changelog for the affected API surface (Checkout
 * Sessions, Subscriptions, Billing Portal, webhooks) — rather than letting
 * the pinned version and the npm package drift apart. See deployment.md,
 * "Stage 18 — Stripe Subscriptions deployment guidance".
 *
 * Cached per-process, same pattern as every other AWS/third-party client
 * singleton in this codebase (`lib/db/client.ts`, `lib/secrets/client.ts`).
 * Never expose this module or its callers to browser bundles.
 */
export const STRIPE_API_VERSION = '2026-06-24.dahlia' as const;

let client: Stripe | undefined;

export async function getStripeClient(): Promise<Stripe> {
  if (client) return client;

  const { secretKey } = await getStripeSecret();
  assertLiveModeAllowed('Stripe', secretKey.startsWith('sk_live_'));
  client = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
  });

  return client;
}
