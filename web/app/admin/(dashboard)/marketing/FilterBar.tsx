import Link from 'next/link';
import { MARKETING_OUTREACH_STATUSES } from '@/domain/models/marketing-outreach';

export interface MarketingFilterValues {
  status?: string;
}

const selectClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent';

/**
 * Plain GET form — mirrors `businesses/FilterBar.tsx`/`analytics/FilterBar.tsx`
 * exactly: filters live in the URL, no client JS. Business-name search is
 * intentionally NOT here — it's a client-side instant filter over the
 * loaded rows, same split `BusinessTable.tsx` uses.
 */
export function FilterBar({ values, hasActiveFilters }: { values: MarketingFilterValues; hasActiveFilters: boolean }) {
  return (
    <form method="GET" className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label htmlFor="status" className="block text-xs font-medium text-gray-500 mb-1">
            Campaign Status
          </label>
          <select id="status" name="status" defaultValue={values.status ?? ''} className={selectClass}>
            <option value="">All statuses</option>
            {MARKETING_OUTREACH_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <button type="submit" className="rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors">
          Apply filters
        </button>
        {hasActiveFilters && (
          <Link href="/admin/marketing" className="text-sm text-gray-500 hover:text-gray-700 hover:underline">
            Clear filters
          </Link>
        )}
      </div>
    </form>
  );
}
