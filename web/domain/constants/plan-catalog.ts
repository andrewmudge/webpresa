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
}

export const PLAN_CATALOG: Record<WebpresaPlan, PlanCatalogEntry> = {
  basic: {
    label: 'Basic',
    priceDisplay: '$39/month',
    description: 'Single-page professionally designed website with city-specific SEO for your primary city.',
  },
  growth: {
    label: 'Growth',
    priceDisplay: '$79/month',
    description: 'Expanded website with multiple city-specific SEO pages and Growth-tier lead forms.',
  },
};

export function getPlanCatalogEntry(plan: WebpresaPlan | undefined): PlanCatalogEntry | undefined {
  return plan ? PLAN_CATALOG[plan] : undefined;
}

export { WEBPRESA_PLANS };
export type { WebpresaPlan };
