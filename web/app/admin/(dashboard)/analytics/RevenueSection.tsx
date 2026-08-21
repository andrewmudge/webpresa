import type { RevenueSummary } from '@/lib/analytics/dashboard-types';
import { formatCents } from './format';
import { MrrTrendChart } from './MrrTrendChart';

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export function RevenueSection({ revenue }: { revenue: RevenueSummary }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 h-full">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Revenue</h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <MiniStat label="Current MRR" value={formatCents(revenue.currentMrrCents)} />
        <MiniStat label="ARR" value={formatCents(revenue.arrCents)} />
        <MiniStat label="New MRR" value={formatCents(revenue.newMrrCents)} />
        <MiniStat label="Churned MRR" value={formatCents(revenue.churnedMrrCents)} />
        <MiniStat label="Net New MRR" value={formatCents(revenue.netNewMrrCents)} />
      </div>
      <MrrTrendChart trend={revenue.trend} />
    </div>
  );
}
