import type { MrrTrendPoint } from '@/lib/analytics/dashboard-types';
import { formatCents } from './format';

/**
 * Hand-built div bar chart — no chart library is installed anywhere in this
 * repo (confirmed via `package.json`), matching this codebase's existing
 * preference for a small hand-rolled UI over a new dependency (the same
 * reasoning behind the native `<input type="date">` filter fields). No
 * gauge/pie shapes, no animation.
 */
export function MrrTrendChart({ trend }: { trend: MrrTrendPoint[] }) {
  if (trend.length === 0) {
    return <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">Not enough data to chart an MRR trend yet.</div>;
  }

  const maxMrrCents = Math.max(1, ...trend.map((point) => point.mrrCents));

  return (
    <div className="flex items-end gap-2 h-36">
      {trend.map((point) => (
        <div key={point.monthEnd} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
          <p className="text-[10px] text-gray-500 mb-1 truncate w-full text-center">{formatCents(point.mrrCents)}</p>
          <div className="w-full rounded-t bg-(--color-brand)" style={{ height: `${Math.max(3, (point.mrrCents / maxMrrCents) * 100)}%` }} />
          <p className="mt-1.5 text-[10px] text-gray-400 whitespace-nowrap">{point.monthLabel}</p>
        </div>
      ))}
    </div>
  );
}
