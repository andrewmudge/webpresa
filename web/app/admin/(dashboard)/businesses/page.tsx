import Link from 'next/link';
import { listBusinesses } from '@/lib/db/businesses';
import { FilterBar } from './FilterBar';
import { BusinessTable } from './BusinessTable';

interface SearchParams {
  cursor?: string;
  status?: string;
  industry?: string;
  source?: string;
  city?: string;
  state?: string;
  createdFrom?: string;
  createdTo?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

export const dynamic = 'force-dynamic';

/** Builds a query string carrying forward every active filter, optionally overriding `cursor`. */
function buildQueryString(filters: SearchParams, cursor?: string): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'cursor') continue;
    if (value) params.set(key, value);
  }
  if (cursor) params.set('cursor', cursor);
  return params.toString();
}

export default async function BusinessListPage({ searchParams }: Props) {
  const { cursor, status, industry, source, city, state, createdFrom, createdTo } = await searchParams;
  const filters: SearchParams = { status, industry, source, city, state, createdFrom, createdTo };
  const hasActiveFilters = Object.values(filters).some(Boolean);

  let result: Awaited<ReturnType<typeof listBusinesses>>;
  let loadError: string | undefined;

  try {
    result = await listBusinesses({ limit: 50, cursor, status, industry, source, city, state, createdFrom, createdTo });
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load businesses';
    result = { items: [], nextCursor: undefined };
  }

  const { items, nextCursor } = result;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Businesses</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} loaded</p>
        </div>
        <Link
          href="/admin/businesses/new"
          className="inline-flex items-center gap-2 rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
        >
          + New business
        </Link>
      </div>

      <FilterBar values={filters} hasActiveFilters={hasActiveFilters} />

      {/* Error state */}
      {loadError && (
        <div
          role="alert"
          className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {loadError}
        </div>
      )}

      {/* Empty state */}
      {!loadError && items.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          {hasActiveFilters ? (
            <>
              <p className="text-lg mb-2">No businesses match these filters</p>
              <Link href="/admin/businesses" className="text-sm text-(--color-brand) hover:underline">
                Clear filters
              </Link>
            </>
          ) : (
            <>
              <p className="text-lg mb-2">No businesses yet</p>
              <Link href="/admin/businesses/new" className="text-sm text-(--color-brand) hover:underline">
                Add the first business →
              </Link>
            </>
          )}
        </div>
      )}

      {/* Table */}
      {items.length > 0 && <BusinessTable items={items} />}

      {/* Pagination */}
      {nextCursor && (
        <div className="mt-6 text-center">
          <Link
            href={`/admin/businesses?${buildQueryString(filters, nextCursor)}`}
            className="text-sm text-(--color-brand) hover:underline"
          >
            Load more →
          </Link>
        </div>
      )}
    </div>
  );
}
