import { getAnalyticsDashboardData } from '@/lib/analytics/dashboard';
import { parseFiltersFromSearchParams } from '@/lib/analytics/date-range';
import type { AnalyticsDashboardViewModel } from '@/lib/analytics/dashboard-types';
import {
  parseVisitorsFiltersFromSearchParams,
  resolveVisitorDateRange,
  getWebsiteVisitorTrend,
  type VisitorTrendSeries,
} from '@/lib/analytics/vercel-visitors';
import { log } from '@/lib/logging/log';
import { FilterBar } from './FilterBar';
import { KpiGrid } from './KpiGrid';
import { FunnelCard } from './FunnelCard';
import { RevenueSection } from './RevenueSection';
import { SubscriberMixCard } from './SubscriberMixCard';
import { BestTemplateCallout } from './BestTemplateCallout';
import { PostcardPerformanceTable } from './PostcardPerformanceTable';
import { CustomerHealthCard } from './CustomerHealthCard';
import { CancellationReasonsCard } from './CancellationReasonsCard';
import { PostcardMapCard } from './PostcardMapCard';
import { WebsiteVisitorsCard } from './WebsiteVisitorsCard';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const filters = parseFiltersFromSearchParams(resolvedSearchParams);
  const visitorsFilters = parseVisitorsFiltersFromSearchParams(resolvedSearchParams);

  // Independent try/catch per data source (via allSettled, not a plain
  // Promise.all) — a Vercel Web Analytics failure (not yet enabled, expired
  // token, plan reporting-window exceeded) must never break the rest of
  // the dashboard, and vice versa.
  const [dashboardResult, visitorsResult] = await Promise.allSettled([
    getAnalyticsDashboardData(filters),
    getWebsiteVisitorTrend(resolveVisitorDateRange(visitorsFilters)),
  ]);

  let data: AnalyticsDashboardViewModel | null = null;
  let loadError: string | undefined;
  if (dashboardResult.status === 'fulfilled') {
    data = dashboardResult.value;
  } else {
    loadError = dashboardResult.reason instanceof Error ? dashboardResult.reason.message : 'Failed to load analytics.';
  }

  let visitorSeries: VisitorTrendSeries = { points: [] };
  if (visitorsResult.status === 'fulfilled') {
    visitorSeries = visitorsResult.value;
  } else {
    log({
      level: 'warn',
      event: 'analytics.visitors.load_failed',
      component: 'admin-analytics',
      message: visitorsResult.reason instanceof Error ? visitorsResult.reason.message : 'Failed to load website visitors.',
    });
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track acquisition, conversion, subscription, and revenue performance.</p>
      </div>

      <FilterBar filters={filters} filterOptions={data?.filterOptions} visitorsFilters={visitorsFilters} />

      {loadError && (
        <div role="alert" className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <KpiGrid kpis={data.kpis} />

          <FunnelCard funnel={data.funnel} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RevenueSection revenue={data.revenue} />
            </div>
            <SubscriberMixCard mix={data.subscriberMix} />
          </div>

          <div>
            <BestTemplateCallout best={data.bestTemplate} />
            <PostcardPerformanceTable rows={data.postcardPerformance} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CustomerHealthCard health={data.customerHealth} />
            <CancellationReasonsCard reasons={data.cancellationReasons} />
          </div>

          <PostcardMapCard pins={data.mapPins} />
        </div>
      )}

      {/* Independent of `data` above (own Promise.allSettled branch, own
          data source) — still renders even when the rest of the dashboard
          failed to load, and vice versa. */}
      <div className={data ? 'mt-6' : undefined}>
        <WebsiteVisitorsCard series={visitorSeries} visitorsFilters={visitorsFilters} pageFilters={filters} />
      </div>
    </div>
  );
}
