import type { AnalyticsDashboardViewModel } from '@/lib/analytics/dashboard-types';
import { formatCents, formatChange, formatCount, formatPercent } from './format';

function KpiTile({ label, current, change }: { label: string; current: string; change: string | null }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{current}</p>
      {change !== null && (
        <p className={`mt-1 text-xs font-medium ${change.startsWith('+') ? 'text-green-600' : change.startsWith('-') ? 'text-red-600' : 'text-gray-400'}`}>
          {change} vs. previous period
        </p>
      )}
    </div>
  );
}

export function KpiGrid({ kpis }: { kpis: AnalyticsDashboardViewModel['kpis'] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <KpiTile label="Active Customers" current={formatCount(kpis.activeCustomers.current)} change={formatChange(kpis.activeCustomers.changePct)} />
      <KpiTile label="MRR" current={kpis.mrrCents.current !== null ? formatCents(kpis.mrrCents.current) : '—'} change={formatChange(kpis.mrrCents.changePct)} />
      <KpiTile label="ARR" current={kpis.arrCents.current !== null ? formatCents(kpis.arrCents.current) : '—'} change={formatChange(kpis.arrCents.changePct)} />
      <KpiTile
        label="New Paid Customers"
        current={formatCount(kpis.newPaidCustomers.current)}
        change={formatChange(kpis.newPaidCustomers.changePct)}
      />
      <KpiTile label="Churn Rate" current={formatPercent(kpis.churnRate.current)} change={formatChange(kpis.churnRate.changePct)} />
      <KpiTile
        label="Postcard → Paid"
        current={formatPercent(kpis.postcardToPaidConversion.current)}
        change={formatChange(kpis.postcardToPaidConversion.changePct)}
      />
    </div>
  );
}
