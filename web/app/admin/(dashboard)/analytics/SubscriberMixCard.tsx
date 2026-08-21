import type { SubscriberMixResult } from '@/lib/analytics/dashboard-types';

function MixBar({ label, count, pct, colorClass }: { label: string; count: number; pct: number; colorClass: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-500">
          {count} {count === 1 ? 'customer' : 'customers'} · {(pct * 100).toFixed(0)}%
        </p>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

export function SubscriberMixCard({ mix }: { mix: SubscriberMixResult }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 h-full">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Subscriber Mix</h2>
      {mix.status === 'empty' ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">No active subscribers yet.</div>
      ) : (
        <div className="space-y-4">
          <MixBar label="Monthly" count={mix.monthlyCount} pct={mix.monthlyPct} colorClass="bg-(--color-brand)" />
          <MixBar label="Annual" count={mix.annualCount} pct={mix.annualPct} colorClass="bg-(--color-accent)" />
        </div>
      )}
    </div>
  );
}
