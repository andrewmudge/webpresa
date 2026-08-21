import type { FunnelResult } from '@/lib/analytics/dashboard-types';
import { formatCount, formatPercent } from './format';

export function FunnelCard({ funnel }: { funnel: FunnelResult }) {
  if (funnel.cohortSize === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Customer Acquisition Funnel</h2>
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">No postcards sent yet in this period.</div>
      </div>
    );
  }

  const maxCount = funnel.stages[0]?.count || 1;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Customer Acquisition Funnel</h2>
        <p className="text-xs text-gray-500">
          Overall: <span className="font-medium text-gray-700">{formatPercent(funnel.overallConversion)}</span> postcard → paid
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {funnel.stages.map((stage, index) => (
          <div key={stage.key}>
            <div className="h-1.5 rounded-full bg-(--color-brand-muted) overflow-hidden mb-2">
              <div className="h-full rounded-full bg-(--color-brand)" style={{ width: `${Math.max(3, (stage.count / maxCount) * 100)}%` }} />
            </div>
            <p className="text-xl font-semibold text-gray-900">{formatCount(stage.count)}</p>
            <p className="text-xs text-gray-500">{stage.label}</p>
            {index > 0 && <p className="mt-1 text-xs text-gray-400">↓ {formatPercent(stage.conversionFromPrevious)}</p>}
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-400">
        &quot;Signed Up&quot; matches &quot;Claimed&quot; exactly — in Webpresa&apos;s current claim flow, an account is created at the same moment a claim
        is consumed, so there is no distinct earlier signup step to count separately.
      </p>
    </div>
  );
}
