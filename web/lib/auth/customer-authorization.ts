import 'server-only';
import { redirect, notFound } from 'next/navigation';
import type { Business } from '@/domain/models/business';
import { getBusinessById } from '@/lib/db/businesses';
import { getCustomerSession, type CustomerSessionPayload } from './customer-session';

/**
 * Stage 17 authorization primitives. Deliberately just these two —
 * `requireActiveSubscription()` is NOT defined here. There is no dashboard
 * route in this stage for it to protect: the "no dashboard before payment"
 * invariant is enforced by the simple fact that no such route exists yet,
 * not by a stub function nothing calls. Stage 18 defines
 * `requireActiveSubscription()` from its own real requirements once
 * subscriptions exist (see implementation.md, Stage 17, "Non-goals").
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
