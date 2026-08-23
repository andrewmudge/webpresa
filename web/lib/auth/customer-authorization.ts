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

// ---------------------------------------------------------------------------
// Plan capability gate (Stage 20). Originally gated `lead_capture` to the
// Growth plan only. MVP launch offers Basic exclusively (Growth is retained
// in code but not sold — see `PlanSelectionForm.tsx`), and lead capture is
// now included in every purchasable plan, so this boundary no longer
// differentiates by plan — only by whether the business has an active
// subscription at all. Reintroduce a per-plan `CAPABILITY_REQUIRED_PLAN` map
// here if a real plan-differentiated capability ever exists again.
// ---------------------------------------------------------------------------

export type PlanCapability = 'lead_capture';

/**
 * Takes an already-computed `BusinessAccessResult` (from
 * `computeBusinessAccessMode`/`requireBusinessAccess`) rather than
 * re-fetching the business, so callers that already did that lookup for
 * another reason (rendering the CTA, gating the dashboard page) don't pay
 * for a second one.
 *
 * A `past_due` (`billing_recovery`) business does NOT pass — actively
 * capturing new leads a business may not stay billed to keep is the wrong
 * default, unlike e.g. merely viewing already-captured data.
 *
 * The public "Request Service" CTA itself renders unconditionally for every
 * business, regardless of entitlement — only the two things that actually
 * matter check this: `submitLeadAction` (`app/b/[slug]/actions.ts`), which
 * silently no-ops (never persists a lead, never distinguishes the response)
 * for a business that doesn't pass this check, and the customer dashboard's
 * leads page/actions, which gate viewing already-captured leads.
 */
export function hasPlanCapability(access: BusinessAccessResult, _capability: PlanCapability): boolean {
  return access.mode === 'full';
}
