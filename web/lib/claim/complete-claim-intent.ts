import 'server-only';
import { cookies } from 'next/headers';
import { getClaimById, consumeClaim } from '@/lib/db/claims';
import { createCustomerSession } from '@/lib/auth/customer-session';
import { CLAIM_INTENT_COOKIE_NAME, verifyClaimIntent } from '@/lib/auth/claim-intent';

export type CompleteClaimIntentResult =
  | { status: 'success'; redirectTo: '/account/claim-status' }
  | { status: 'error'; redirectTo: '/claim?error=1' };

/**
 * Runs the ownership-reservation transaction for the claim referenced by the
 * current `claim_intent` cookie, then establishes the customer session — the
 * single completion path shared by every way a customer can finish claiming
 * a business: the password sign-up-then-confirm flow, the password sign-in
 * flow, and Google sign-in (`app/api/auth/google/callback/route.ts`) — see
 * implementation.md, Stage 17, "Detailed workflow", steps 7-9.
 *
 * A plain lib function (not a Server Action) specifically so it can be
 * called from both a `'use server'` file (`app/claim/actions.ts`) and a
 * Route Handler (the Google callback) without relying on cross-calling a
 * Server Action from a Route Handler. Returns a result instead of calling
 * `redirect()` itself — `redirect()` from `next/navigation` isn't the right
 * tool inside a Route Handler (which redirects via `NextResponse`), so each
 * caller redirects itself using `result.redirectTo`.
 *
 * Cross-checks the cookie's `businessId` against the freshly-loaded `Claim`'s
 * own `businessId` — defense in depth only; a `Claim`'s `businessId` never
 * changes after creation, so these should never actually diverge, but the
 * cookie is client-held and every claim carried in it must be re-verified
 * against the database regardless.
 *
 * No special-casing is needed for "this exact identity already owns this
 * business" (e.g. a password user re-authenticating via Google on the same
 * claim after Cognito's Pre Sign-up trigger has linked the two identities to
 * one `sub`) — `consumeClaim` already distinguishes that case
 * (`already_consumed_by_user`) from a genuine conflict and treats it as
 * success, since it's the same idempotent-retry case a double form submit
 * would hit.
 */
export async function completeClaimIntent(sub: string, email: string): Promise<CompleteClaimIntentResult> {
  const cookieStore = await cookies();
  const intent = await verifyClaimIntent(cookieStore.get(CLAIM_INTENT_COOKIE_NAME)?.value);
  if (!intent) return { status: 'error', redirectTo: '/claim?error=1' };

  const claim = await getClaimById(intent.claimId);
  if (!claim || claim.businessId !== intent.businessId) return { status: 'error', redirectTo: '/claim?error=1' };

  const result = await consumeClaim({ claimId: claim.claimId, businessId: claim.businessId, userId: sub });
  if (result.outcome === 'conflict') return { status: 'error', redirectTo: '/claim?error=1' };

  await createCustomerSession({ sub, email });
  cookieStore.delete(CLAIM_INTENT_COOKIE_NAME);
  return { status: 'success', redirectTo: '/account/claim-status' };
}
