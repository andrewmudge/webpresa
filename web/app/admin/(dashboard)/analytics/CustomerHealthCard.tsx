import type { CustomerHealthResult } from '@/lib/analytics/dashboard-types';
import { formatCount, formatPercent } from './format';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export function CustomerHealthCard({ health }: { health: CustomerHealthResult }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 h-full">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Customer Health</h2>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="New Customers" value={formatCount(health.newCustomers)} />
        <Stat label="Customers Canceled" value={formatCount(health.canceledCustomers)} />
        <Stat label="Net Customer Growth" value={`${health.netGrowth > 0 ? '+' : ''}${health.netGrowth}`} />
        <Stat label="Churn Rate" value={formatPercent(health.churnRate)} />
      </div>
      {health.canceledCustomers === 0 && <p className="mt-4 text-xs text-gray-400">No cancellations during this period.</p>}
    </div>
  );
}
