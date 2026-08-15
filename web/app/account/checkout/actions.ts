'use server';
import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership } from '@/lib/auth/customer-authorization';
import { updateBusiness } from '@/lib/db/businesses';
import { getCustomerBillingProfile, createCustomerBillingProfile } from '@/lib/db/customer-billing';
import { listClaimsForBusiness } from '@/lib/db/claims';
import { getStripeClient } from '@/lib/stripe/client';
import { resolvePriceId } from '@/lib/stripe/plans';
import { buildTrustedMetadata, resolveRuntimeEnvironment } from '@/lib/stripe/metadata';
import { resolveAppBaseUrl } from '@/lib/env/app-base-url';
import { WEBPRESA_PLANS, type WebpresaPlan, BILLING_INTERVALS, type BillingInterval } from '@/domain/constants/plans';

/**
 * Checkout-session and Customer Portal creation (Stage 18) — see
 * implementation.md, Stage 18, "Detailed Checkout workflow" /
 * "Customer Portal requirements".
 */

export type CheckoutActionState = { error?: string } | undefined;

function parseWebpresaPlan(input: FormDataEntryValue | null): WebpresaPlan | null {
  const value = typeof input === 'string' ? input : '';
  return (WEBPRESA_PLANS as readonly string[]).includes(value) ? (value as WebpresaPlan) : null;
}

/** Defaults to `'monthly'` for any missing/unrecognized value — never lets browser-supplied input pick an arbitrary Price ID (see `resolvePriceId`). */
function parseBillingInterval(input: FormDataEntryValue | null): BillingInterval {
  const value = typeof input === 'string' ? input : '';
  return (BILLING_INTERVALS as readonly string[]).includes(value) ? (value as BillingInterval) : 'monthly';
}

/**
 * Resolves (creating if necessary) the ONE Stripe Customer for this Cognito
 * identity — never a per-Business Stripe Customer. On a lost race against a
 * concurrent first-checkout for the same customer, discards the Stripe
 * Customer this call just created and reuses the winner's instead (see
 * `lib/db/customer-billing.ts`).
 */
async function resolveStripeCustomerIdForCustomer(userId: string, email: string): Promise<string> {
  const existing = await getCustomerBillingProfile(userId);
  if (existing) return existing.stripeCustomerId;

  const stripe = await getStripeClient();
  const customer = await stripe.customers.create({ email, metadata: { ownerUserId: userId } });
  const result = await createCustomerBillingProfile(userId, customer.id);
  return result.profile.stripeCustomerId;
}

/** Provenance only — the Stage 17 Claim is fully consumed/terminal by now;
 *  never re-validated as an authorization input. */
async function findClaimIdForAudit(businessId: string, userId: string): Promise<string | undefined> {
  const claims = await listClaimsForBusiness(businessId);
  return claims.find((claim) => claim.status === 'consumed' && claim.consumedByUserId === userId)?.claimId;
}

async function createPortalSessionUrl(stripeCustomerId: string): Promise<string> {
  const stripe = await getStripeClient();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${resolveAppBaseUrl()}/account/claim-status`,
  });
  return portalSession.url;
}

export async function createCheckoutSessionAction(
  _prevState: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const session = await requireCustomerSession();

  const businessId = formData.get('businessId');
  const plan = parseWebpresaPlan(formData.get('plan'));
  const billingInterval = parseBillingInterval(formData.get('billingInterval'));
  const agreedToTerms = formData.get('agreeToTerms') === 'on';

  if (typeof businessId !== 'string' || !businessId) return { error: 'Missing business.' };
  if (!plan) return { error: 'Choose a plan.' };
  if (!agreedToTerms) return { error: 'You must agree to the Terms of Service and Privacy Policy to continue.' };

  const business = await requireBusinessOwnership(session.sub, businessId);

  // Already has a subscription — send to the Portal, don't create a second one.
  if (business.subscriptionStatus === 'active' || business.subscriptionStatus === 'past_due') {
    const profile = await getCustomerBillingProfile(session.sub);
    if (!profile) redirect('/account/claim-status');
    redirect(await createPortalSessionUrl(profile.stripeCustomerId));
  }

  const stripe = await getStripeClient();

  // Reuse a still-open Checkout Session rather than a coarse time-bucketed
  // idempotency key — checked live against Stripe, not blindly trusted.
  let resumeUrl: string | undefined;
  if (business.pendingCheckoutSessionId) {
    try {
      const existingSession = await stripe.checkout.sessions.retrieve(business.pendingCheckoutSessionId);
      if (existingSession.status === 'open' && existingSession.url) {
        resumeUrl = existingSession.url;
      }
    } catch {
      // No longer retrievable — fall through to creating a fresh Session.
    }
  }
  if (resumeUrl) redirect(resumeUrl);

  let checkoutUrl: string;
  try {
    const appBaseUrl = resolveAppBaseUrl();
    const stripeCustomerId = await resolveStripeCustomerIdForCustomer(session.sub, session.email);
    const priceId = resolvePriceId(plan, billingInterval);
    const claimId = await findClaimIdForAudit(businessId, session.sub);
    const environment = resolveRuntimeEnvironment();
    const termsVersion = process.env.TERMS_VERSION ?? 'unversioned';
    const acceptedTermsAt = new Date().toISOString();

    const metadata = buildTrustedMetadata({
      businessId,
      ownerUserId: session.sub,
      plan,
      billingPurpose: 'website_subscription',
      environment,
      claimId,
      termsVersion,
      acceptedTermsAt,
      billingInterval,
    });

    // A fresh, single-use idempotency key per creation call — protects this
    // ONE call against duplication by a transient network retry, which is
    // what Stripe idempotency keys are actually for. Duplicate-click
    // protection comes from the pending-Session-reuse check above instead,
    // not from reusing this key across separate user attempts.
    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: stripeCustomerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appBaseUrl}/account/checkout/success?business=${businessId}`,
        cancel_url: `${appBaseUrl}/account/checkout/canceled?business=${businessId}`,
        billing_address_collection: 'required',
        subscription_data: { metadata },
        metadata,
      },
      { idempotencyKey: crypto.randomUUID() },
    );

    if (!checkoutSession.url) throw new Error('Stripe did not return a Checkout URL');

    await updateBusiness(businessId, {
      stripeCustomerId,
      termsVersion,
      acceptedTermsAt,
      pendingCheckoutSessionId: checkoutSession.id,
      pendingCheckoutExpiresAt: checkoutSession.expires_at
        ? new Date(checkoutSession.expires_at * 1000).toISOString()
        : undefined,
    });

    checkoutUrl = checkoutSession.url;
  } catch (err) {
    console.error('[stripe] checkout_session_creation_failed', { businessId, err });
    return { error: 'Unable to start checkout. Please try again.' };
  }

  redirect(checkoutUrl);
}

/**
 * Bound to a `businessId` and used directly as a form action (no
 * `useActionState`). A Stripe portal-session failure redirects back to the
 * calling business's billing page with `?error=portal_unavailable` instead
 * of throwing to a generic error boundary, so the page can show a plain-
 * language retry message.
 */
export async function createBillingPortalSessionAction(businessId: string): Promise<void> {
  const session = await requireCustomerSession();
  await requireBusinessOwnership(session.sub, businessId);

  const profile = await getCustomerBillingProfile(session.sub);
  if (!profile) redirect('/account/claim-status');

  let portalUrl: string;
  try {
    portalUrl = await createPortalSessionUrl(profile.stripeCustomerId);
  } catch (err) {
    console.error('[stripe] portal_session_creation_failed', { businessId, err });
    redirect(`/app/businesses/${businessId}/billing?error=portal_unavailable`);
  }

  redirect(portalUrl);
}
