'use client';

import { useMemo, useState } from 'react';
import type { TemplatePerformanceRow } from '@/lib/analytics/dashboard-types';
import { formatCents, formatCount, formatPercent, formatTemplateLabel } from './format';

type SortableKey = 'sent' | 'engagementRate' | 'claimRate' | 'paidConversion' | 'revenueAttributedCents';
type SortDirection = 'asc' | 'desc';

const SORTABLE_COLUMNS: { key: SortableKey; label: string }[] = [
  { key: 'sent', label: 'Sent' },
  { key: 'engagementRate', label: 'Engagement Rate' },
  { key: 'claimRate', label: 'Claim Rate' },
  { key: 'paidConversion', label: 'Paid Conversion' },
  { key: 'revenueAttributedCents', label: 'MRR Attributed' },
];

/**
 * 'use client' only for local sort interaction — mirrors
 * `NeedsAttentionSection.tsx`'s precedent of a thin client wrapper around
 * already server-computed data (`rows` is fully assembled by
 * `lib/analytics/attribution.ts`; this component only re-orders the array
 * client-side, no server round trip). Default sort matches the spec's own
 * emphasis: "the most important column is Paid Conversion."
 */
export function PostcardPerformanceTable({ rows }: { rows: TemplatePerformanceRow[] }) {
  const [sortKey, setSortKey] = useState<SortableKey>('paidConversion');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1; // nulls sort last regardless of direction
      if (bValue === null) return -1;
      return sortDir === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [rows, sortKey, sortDir]);

  function handleSort(key: SortableKey) {
    if (key === sortKey) {
      setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Postcard Performance</h2>
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
          Not enough data to compare postcard templates yet.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <h2 className="text-sm font-semibold text-gray-900 px-5 pt-5 pb-3">Postcard Performance</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Template</th>
              <SortHeader col="sent" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <th className="px-4 py-3">Engaged</th>
              <SortHeader col="engagementRate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <th className="px-4 py-3">Claimed</th>
              <SortHeader col="claimRate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <th className="px-4 py-3">Paid Customers</th>
              <SortHeader col="paidConversion" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHeader col="revenueAttributedCents" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedRows.map((row) => (
              <tr key={row.templateVariant} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 capitalize">{formatTemplateLabel(row.templateVariant)}</td>
                <td className="px-4 py-3 text-gray-600">{formatCount(row.sent)}</td>
                <td className="px-4 py-3 text-gray-400">{formatCount(row.engaged)}</td>
                <td className="px-4 py-3 text-gray-600">{formatPercent(row.engagementRate)}</td>
                <td className="px-4 py-3 text-gray-400">{formatCount(row.claimed)}</td>
                <td className="px-4 py-3 text-gray-600">{formatPercent(row.claimRate)}</td>
                <td className="px-4 py-3 text-gray-400">{formatCount(row.paidCustomers)}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{formatPercent(row.paidConversion)}</td>
                <td className="px-4 py-3 text-gray-600">{formatCents(row.revenueAttributedCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortHeader({
  col,
  sortKey,
  sortDir,
  onSort,
}: {
  col: SortableKey;
  sortKey: SortableKey;
  sortDir: SortDirection;
  onSort: (key: SortableKey) => void;
}) {
  const column = SORTABLE_COLUMNS.find((c) => c.key === col)!;
  return (
    <th className="px-4 py-3">
      <button type="button" onClick={() => onSort(col)} className="flex items-center gap-1 hover:text-gray-700">
        {column.label}
        {sortKey === col && <span aria-hidden="true">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}
