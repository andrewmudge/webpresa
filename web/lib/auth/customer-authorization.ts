import 'server-only';
import { redirect, notFound } from 'next/navigation';
import type { Business } from '@/domain/models/business';
import type { WebpresaPlan } from '@/domain/constants/plans';
import { getBusinessById } from '@/lib/db/businesses';
import { getCustomerSession, type CustomerSessionPayload } from './customer-session';

/**
 * Stage 17 authorization primitives, extended by Stage 18 below with the
 * entitlement boundary Stage 17 deliberately deferred (there was no
 * dashboard route yet for it to protect).
 */

/** Reads the customer session cookie; redirects to sign-in if absent/invalid. */
export async function requireCustomerSession(): Promise<CustomerSessionPayload> {
  const session = await getCustomerSession();
  if (!session) redirect('/account/sign-in');
  return session;
}

/**
 * Verifies the session's userId owns this business. Does NOT check payment.
 * Returns a generic 404-style failure rather than 403 — never confirms or
 * denies a businessId's existence to a non-owner.
 */
export async function requireBusinessOwnership(userId: string, businessId: string): Promise<Business> {
  const business = await getBusinessById(businessId);
  if (!business || business.ownerUserId !== userId) {
    notFound();
  }
  return business;
}

// ---------------------------------------------------------------------------
// Entitlement (Stage 18 — Stripe Subscriptions)
// ---------------------------------------------------------------------------

export type BusinessAccessMode = 'full' | 'billing_recovery' | 'none';

export interface BusinessAccessResult {
  mode: BusinessAccessMode;
  plan?: WebpresaPlan;
}

/**
 * Pure `subscriptionStatus` → `BusinessAccessMode` mapping, extracted so
 * `requireBusinessAccess` below and `app/b/[slug]/page.tsx`'s draft-preview
 * resolution (Stage 19) share exactly one implementation instead of two
 * copies of this mapping drifting apart. Takes only the two fields it needs
 * rather than a whole `Business`, so callers that already have a narrower
 * shape (or a business fetched for an unrelated reason) don't need to
 * reshape anything to call it.
 *
 * `'canceled'` still within Stripe's own `active`+`cancel_at_period_end`
 * grace window is NOT a fourth state here — Stripe itself keeps
 * `subscriptionStatus` at `'active'` for the customer's entire paid period,
 * only flipping to `'canceled'` once the period genuinely ends (see
 * `lib/stripe/status-mapping.ts`).
 */
export function computeBusinessAccessMode(
  business: Pick<Business, 'subscriptionStatus' | 'plan'>,
): BusinessAccessResult {
  if (business.subscriptionStatus === 'active') {
    return { mode: 'full', plan: business.plan };
  }
  if (business.subscriptionStatus === 'past_due') {
    return { mode: 'billing_recovery', plan: business.plan };
  }
  return { mode: 'none' }; // 'canceled' or unset — never purchased, or fully ended
}

/**
 * The real entitlement boundary. Named `requireBusinessAccess` rather than
 * `requireActiveSubscription` because it deliberately also admits
 * `'past_due'` (as a restricted `'billing_recovery'` mode) — a name implying
 * "active only" would be misleading for a helper that lets more than
 * `active` through.
 *
 * Never trusts: browser state, a success-URL query parameter, `ownerUserId`
 * alone, `stripeCustomerId`'s mere presence, or any client-supplied
 * identifier — only `business.subscriptionStatus`, which only the verified
 * webhook handler ever writes.
 */
export async function requireBusinessAccess(userId: string, businessId: string): Promise<BusinessAccessResult> {
  const business = await requireBusinessOwnership(userId, businessId);
  return computeBusinessAccessMode(business);
}

/**
 * A strict variant for call sites that need `'full'` access only — a thin
 * wrapper over `requireBusinessAccess`, not a separate authority. Redirects
 * to plan selection unless entitlement is genuinely `'full'`.
 */
export async function requireActiveSubscription(userId: string, businessId: string): Promise<BusinessAccessResult> {
  const result = await requireBusinessAccess(userId, businessId);
  if (result.mode !== 'full') redirect('/account/claim-status');
  return result;
}

// NOT added in Stage 18: a future `requirePlanCapability(businessId, capability)`
// boundary (e.g. `capability === 'multi_city_seo'` implies `plan === 'growth'`)
// is intentionally not shipped as an unimplemented stub — there is no
// consuming route in this app yet for it to protect. Stage 19/20 should
// define it from their own real requirements once a real Basic/Growth
// feature difference exists to gate, the same principle Stage 17 already
// applied to this file before Stage 18 existed.
