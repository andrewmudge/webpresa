import Link from 'next/link';
import { listBusinesses } from '@/lib/db/businesses';
import type { Business } from '@/domain/models/business';

interface SearchParams {
  cursor?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

export const dynamic = 'force-dynamic';

export default async function BusinessListPage({ searchParams }: Props) {
  const { cursor } = await searchParams;

  let result: Awaited<ReturnType<typeof listBusinesses>>;
  let loadError: string | undefined;

  try {
    result = await listBusinesses({ limit: 50, cursor });
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
          <p className="text-lg mb-2">No businesses yet</p>
          <Link href="/admin/businesses/new" className="text-sm text-(--color-brand) hover:underline">
            Add the first business →
          </Link>
        </div>
      )}

      {/* Table */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 font-medium text-gray-600">Industry</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Source</th>
                <th className="px-4 py-3 font-medium text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((b) => (
                <BusinessRow key={b.businessId} business={b} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {nextCursor && (
        <div className="mt-6 text-center">
          <Link
            href={`/admin/businesses?cursor=${encodeURIComponent(nextCursor)}`}
            className="text-sm text-(--color-brand) hover:underline"
          >
            Load more →
          </Link>
        </div>
      )}
    </div>
  );
}

function BusinessRow({ business: b }: { business: Business }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <Link
          href={`/admin/businesses/${b.businessId}`}
          className="font-medium text-gray-900 hover:text-(--color-brand) hover:underline"
        >
          {b.name}
        </Link>
        {b.address?.city && (
          <span className="ml-2 text-xs text-gray-400">
            {b.address.city}, {b.address.state}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-600">{b.industry.replace('_', ' ')}</td>
      <td className="px-4 py-3">
        <StatusBadge status={b.status} />
      </td>
      <td className="px-4 py-3 text-gray-600">{b.source}</td>
      <td className="px-4 py-3 text-gray-400 text-xs">
        {new Date(b.createdAt).toLocaleDateString()}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: Business['status'] }) {
  const styles: Record<Business['status'], string> = {
    active: 'bg-green-50 text-green-700',
    pending: 'bg-yellow-50 text-yellow-700',
    inactive: 'bg-gray-50 text-gray-600',
    archived: 'bg-red-50 text-red-600',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
