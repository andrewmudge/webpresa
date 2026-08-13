import 'server-only';
import type Stripe from 'stripe';
import type { BillingPurpose, WebpresaPlan } from '@/domain/constants/plans';
import { resolveRuntimeEnvironment } from '@/lib/env/runtime-environment';

export { resolveRuntimeEnvironment };

/**
 * Trusted metadata attached to every Checkout Session/Subscription this
 * platform creates — resolved entirely server-side from the authenticated
 * session and the owned Business, never from browser-supplied input.
 *
 * `billingPurpose` is always `'website_subscription'` for Stage 18 — the
 * boundary that lets a future domain-purchase/renewal charge (sharing the
 * same `CustomerBillingProfile` Stripe Customer) never be misread by this
 * webhook handler as a website-subscription event.
 */
export interface TrustedCheckoutMetadata {
  businessId: string;
  ownerUserId: string;
  plan: WebpresaPlan;
  billingPurpose: BillingPurpose;
  environment: string;
  claimId?: string;
  termsVersion?: string;
  acceptedTermsAt?: string;
}

export function buildTrustedMetadata(input: TrustedCheckoutMetadata): Stripe.MetadataParam {
  const metadata: Record<string, string> = {
    businessId: input.businessId,
    ownerUserId: input.ownerUserId,
    plan: input.plan,
    billingPurpose: input.billingPurpose,
    environment: input.environment,
  };
  if (input.claimId) metadata.claimId = input.claimId;
  if (input.termsVersion) metadata.termsVersion = input.termsVersion;
  if (input.acceptedTermsAt) metadata.acceptedTermsAt = input.acceptedTermsAt;
  return metadata;
}

/** Reads `metadata.businessId` off a Stripe object — never trusted alone for
 *  webhook business-resolution (cross-checked against the
 *  `stripe-subscription-id-index` GSI once a subscription ID is known), but
 *  always server-set, never client input. */
export function extractBusinessId(metadata: Stripe.Metadata | null | undefined): string | undefined {
  return metadata?.businessId || undefined;
}

export function extractBillingPurpose(metadata: Stripe.Metadata | null | undefined): string | undefined {
  return metadata?.billingPurpose || undefined;
}

export function extractClaimId(metadata: Stripe.Metadata | null | undefined): string | undefined {
  return metadata?.claimId || undefined;
}
