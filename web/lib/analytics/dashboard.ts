import 'server-only';
import { unstable_cache } from 'next/cache';
import { listAllBusinesses } from '@/lib/db/businesses';
import { listAllPostcards } from '@/lib/db/postcards';
import { listCampaignRecipientsByIds } from '@/lib/db/campaign-recipients';
import { listAllCampaigns } from '@/lib/db/campaigns';
import { INDUSTRIES } from '@/domain/constants/industries';
import { POSTCARD_TEMPLATE_VARIANTS } from '@/domain/models/postcard';
import { resolvePostcardTemplateVariant } from '@/lib/postcards/template';
import { resolveDateRange } from './date-range';
import { computeChangePct, countActiveAsOf, mrrCentsAsOf, computeMrrBreakdown, computeChurnRate, computeSubscriberMix, computeCustomerHealth } from './calculations';
import { attributePostcardOutcomes, aggregateTemplatePerformance, pickBestPerformingTemplate, getCancellationReasons } from './attribution';
import { MIN_TEMPLATE_SAMPLE_SIZE, type AnalyticsFilters, type AnalyticsDashboardViewModel, type KpiValue } from './dashboard-types';

/**
 * Stage 29 — the Analytics page's sole entry point, mirroring
 * `lib/operations/needs-attention.ts`'s `aggregateNeedsAttention()` role:
 * fetches everything via `Promise.all`, then hands the raw arrays to the
 * pure `calculations.ts`/`attribution.ts` functions. Every list call below
 * is the same bounded-Scan pattern `listAllBusinesses()`/`listAllPostcards()`
 * already establish — deliberately not the flagged `status-index` GSIs (see
 * those functions' own doc comments).
 */

function buildKpi(current: number | null, previous: number | null): KpiValue {
  return { current, previous, changePct: current !== null && previous !== null ? computeChangePct(current, previous) : null };
}

async function computeDashboard(filters: AnalyticsFilters): Promise<AnalyticsDashboardViewModel> {
  const window = resolveDateRange(filters);
  const now = new Date();

  const [allBusinesses, allPostcards, allCampaigns] = await Promise.all([listAllBusinesses(), listAllPostcards(), listAllCampaigns()]);

  const businesses = filters.industry ? allBusinesses.filter((b) => b.industry === filters.industry) : allBusinesses;
  const businessesById = new Map(businesses.map((b) => [b.businessId, b]));

  // Cohort: real campaign mailings only (`campaignRecipientId` set — excludes
  // one-off test sends), successfully submitted within the selected window,
  // for a business that survived the industry filter.
  let cohortPostcards = allPostcards.filter(
    (p) => !!p.campaignRecipientId && !!p.submittedAt && p.submittedAt >= window.start && p.submittedAt < window.end && businessesById.has(p.businessId),
  );

  const recipientIds = Array.from(new Set(cohortPostcards.map((p) => p.campaignRecipientId!)));
  const recipients = await listCampaignRecipientsByIds(recipientIds);
  const recipientsById = new Map(recipients.map((r) => [r.campaignRecipientId, r]));

  if (filters.campaignId) {
    cohortPostcards = cohortPostcards.filter((p) => recipientsById.get(p.campaignRecipientId!)?.campaignId === filters.campaignId);
  }
  if (filters.templateVariant) {
    cohortPostcards = cohortPostcards.filter((p) => {
      const business = businessesById.get(p.businessId);
      const variant = p.templateVariant ?? (business ? resolvePostcardTemplateVariant(business) : undefined);
      return variant === filters.templateVariant;
    });
  }

  const cohortInput = { postcards: cohortPostcards, recipientsById, businessesById };
  const funnel = attributePostcardOutcomes(cohortInput);
  const postcardPerformance = aggregateTemplatePerformance(cohortInput);
  const bestTemplate = pickBestPerformingTemplate(postcardPerformance, MIN_TEMPLATE_SAMPLE_SIZE);

  const revenue = computeMrrBreakdown(businesses, window, now);
  const subscriberMix = computeSubscriberMix(businesses);
  const customerHealth = computeCustomerHealth(businesses, window, now);

  const nowIso = now.toISOString();
  const activeCustomersPrevious = window.previousEnd !== undefined ? countActiveAsOf(businesses, window.previousEnd, nowIso) : null;
  const mrrPrevious = window.previousEnd !== undefined ? mrrCentsAsOf(businesses, window.previousEnd, nowIso) : null;

  let newPaidPrevious: number | null = null;
  let churnPrevious: number | null = null;
  if (window.previousStart !== undefined && window.previousEnd !== undefined) {
    newPaidPrevious = businesses.filter((b) => b.firstPaidAt && b.firstPaidAt >= window.previousStart! && b.firstPaidAt < window.previousEnd!).length;
    const canceledPrevious = businesses.filter(
      (b) => b.subscriptionStatus === 'canceled' && b.canceledAt && b.canceledAt >= window.previousStart! && b.canceledAt < window.previousEnd!,
    ).length;
    churnPrevious = computeChurnRate(canceledPrevious, countActiveAsOf(businesses, window.previousStart!, nowIso));
  }

  return {
    window,
    filterOptions: {
      industries: [...INDUSTRIES],
      templates: [...POSTCARD_TEMPLATE_VARIANTS],
      campaigns: allCampaigns.map((c) => ({ campaignId: c.campaignId, name: c.name })),
    },
    kpis: {
      activeCustomers: buildKpi(customerHealth.activeCustomers, activeCustomersPrevious),
      mrrCents: buildKpi(revenue.currentMrrCents, mrrPrevious),
      arrCents: buildKpi(revenue.arrCents, mrrPrevious !== null ? mrrPrevious * 12 : null),
      newPaidCustomers: buildKpi(customerHealth.newCustomers, newPaidPrevious),
      churnRate: buildKpi(customerHealth.churnRate, churnPrevious),
      // No prior-period comparison for MVP — re-running the whole cohort
      // computation against a second window is deferred per the spec's own
      // "where practical" qualifier and "don't let comparison logic delay
      // the overall feature" instruction.
      postcardToPaidConversion: buildKpi(funnel.overallConversion, null),
    },
    funnel,
    postcardPerformance,
    bestTemplate,
    revenue,
    subscriberMix,
    customerHealth,
    cancellationReasons: getCancellationReasons(),
  };
}

/**
 * ~3 minute freshness (per the spec's "1-5 min" target) via `unstable_cache`
 * — deprecated in favor of the `"use cache"` directive in Next.js 16, but
 * that requires opting the whole app into Cache Components
 * (`cacheComponents: true` in `next.config.ts`), a much larger architectural
 * change out of scope for an additive analytics page. `unstable_cache`
 * remains fully functional and needs no config change. Differs deliberately
 * from Operations' fully-uncached `force-dynamic`: Operations is incident
 * response where staleness is actively harmful, Analytics is a reporting
 * page where a few minutes of staleness is the norm, and the underlying
 * computation (two bounded full scans + a batch-get) is heavier and worth
 * not repeating on every filter tweak within the cache window.
 */
const getCachedDashboard = unstable_cache(async (filters: AnalyticsFilters) => computeDashboard(filters), ['analytics-dashboard'], {
  revalidate: 180,
  tags: ['analytics-dashboard'],
});

export async function getAnalyticsDashboardData(filters: AnalyticsFilters): Promise<AnalyticsDashboardViewModel> {
  return getCachedDashboard(filters);
}
