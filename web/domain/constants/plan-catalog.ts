import { WEBPRESA_PLANS, type WebpresaPlan } from './plans';

/**
 * Human-facing plan display strings — label, monthly price, and a short
 * description. Extracted (Stage 19) from what was previously inline literal
 * text duplicated inside `PlanSelectionForm.tsx` (`/account/claim-status`) —
 * the new `/app/businesses/[businessId]/billing` page needed the same
 * label/price a second time, and two independent copies of `"$39/month"`
 * is exactly the kind of drift this app avoids elsewhere (see `WEBPRESA_PLANS`
 * itself). Pure domain data, no framework dependency, so both a client
 * component (`PlanSelectionForm`) and a server component (the Billing page)
 * can import it directly.
 *
 * Never a source of truth for what Stripe actually charges — that remains
 * `lib/stripe/plans.ts`'s server-only `resolvePriceId()`, driven by the
 * `STRIPE_PRICE_ID_BASIC`/`STRIPE_PRICE_ID_GROWTH` environment variables.
 * This catalog is display text only; changing a price here does not change
 * what Stripe bills — both must be updated together by whoever changes
 * pricing.
 */
export interface PlanCatalogEntry {
  label: string;
  priceDisplay: string;
  description: string;
  /** Short bullet list for plan-comparison UI (e.g. the claim-status activation cards). */
  features: string[];
  /** Shown above `features` for a plan that builds on a lower tier (e.g. "Everything in Basic, plus:") — omitted otherwise. */
  featuresIntro?: string;
}

export const PLAN_CATALOG: Record<WebpresaPlan, PlanCatalogEntry> = {
  basic: {
    label: 'Basic',
    priceDisplay: '$39/month',
    description: 'Everything you need to get online and be found in your primary city.',
    features: [
      'Professional single-page website',
      'Hosting & SSL included',
      'Mobile optimized',
      'Local SEO for your city',
      'Unlimited edits to your website',
      'Email & phone support',
    ],
  },
  growth: {
    label: 'Growth',
    priceDisplay: '$79/month',
    description: 'Expand your visibility with multiple pages and lead generation tools.',
    featuresIntro: 'Everything in Basic, plus:',
    features: [
      'Multiple city-specific SEO pages',
      'Lead forms to capture new customers',
      'Advanced on-page SEO',
      'Priority support',
    ],
  },
};

export function getPlanCatalogEntry(plan: WebpresaPlan | undefined): PlanCatalogEntry | undefined {
  return plan ? PLAN_CATALOG[plan] : undefined;
}

export { WEBPRESA_PLANS };
export type { WebpresaPlan };
