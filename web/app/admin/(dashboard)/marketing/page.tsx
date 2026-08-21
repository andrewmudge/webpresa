import Link from 'next/link';
import { getMarketingDashboardData } from '@/lib/marketing/dashboard';
import { KpiGrid } from './KpiGrid';
import { FilterBar, type MarketingFilterValues } from './FilterBar';
import { CampaignSettingsCard } from './CampaignSettingsCard';
import { OutreachTable } from './OutreachTable';

export const dynamic = 'force-dynamic';

interface SearchParams {
  status?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function MarketingPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const filters: MarketingFilterValues = { status };
  const hasActiveFilters = Boolean(status);

  const data = await getMarketingDashboardData();
  const rows = status ? data.rows.filter((row) => row.outreach.status === status) : data.rows;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Marketing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Postcard-to-email outreach — {data.rows.length} enrolled</p>
        </div>
        <Link
          href="/admin/marketing/templates"
          className="inline-flex items-center gap-2 rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
        >
          Email Templates
        </Link>
      </div>

      <KpiGrid kpis={data.kpis} activeCampaigns={data.campaign.status === 'enabled' ? 1 : 0} />

      <CampaignSettingsCard campaign={data.campaign} />

      <FilterBar values={filters} hasActiveFilters={hasActiveFilters} />

      {rows.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          {hasActiveFilters ? (
            <>
              <p className="text-lg mb-2">No outreach matches these filters</p>
              <Link href="/admin/marketing" className="text-sm text-(--color-brand) hover:underline">
                Clear filters
              </Link>
            </>
          ) : (
            <p className="text-lg mb-2">No businesses enrolled yet — outreach starts when Lob reports a postcard delivered.</p>
          )}
        </div>
      ) : (
        <OutreachTable rows={rows} />
      )}
    </div>
  );
}
