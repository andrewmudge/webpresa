import Link from 'next/link';
import { listAllScans } from '@/lib/db/scan-events';
import { getBusinessById } from '@/lib/db/businesses';
import type { ScanEvent, ScanStatus } from '@/domain/models/scan-event';
import { ScanTypeBadge } from './ScanTypeBadge';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<ScanStatus, string> = {
  queued: 'bg-gray-50 text-gray-600',
  running: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  partial: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-600',
  manual_approval_required: 'bg-amber-50 text-amber-700',
};

const STATUS_LABELS: Record<ScanStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  partial: 'Partially completed',
  failed: 'Failed',
  manual_approval_required: 'Manual approval required',
};

function StatusBadge({ status }: { status: ScanStatus }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

interface Props {
  searchParams: Promise<{ businessId?: string }>;
}

export default async function ScansPage({ searchParams }: Props) {
  const { businessId: filterBusinessId } = await searchParams;
  let scans: ScanEvent[] = [];
  let loadError: string | undefined;

  try {
    scans = await listAllScans();
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load scans';
  }

  // Dev-scale: listAllScans() already fetches the whole table (see its own
  // doc comment on why there's no GSI for this), so a business filter is
  // just applied in-memory here rather than threaded into the repository.
  const filterBusiness = filterBusinessId ? await getBusinessById(filterBusinessId).catch(() => null) : null;
  if (filterBusinessId) {
    scans = scans.filter((s) => s.businessId === filterBusinessId);
  }

  const uniqueBusinessIds = Array.from(new Set(scans.map((s) => s.businessId)));
  const businesses = await Promise.all(uniqueBusinessIds.map((id) => getBusinessById(id).catch(() => null)));
  const businessNameById = new Map(
    uniqueBusinessIds.map((id, i) => [id, businesses[i]?.name ?? null] as const),
  );

  // Unfiltered view: one row per business (its latest scan), since `scans`
  // is already sorted newest-first — the first occurrence per businessId is
  // that business's latest attempt. The filtered (?businessId=) view already
  // shows the full un-grouped history for one company, so it's left as-is.
  const scanCountByBusiness = new Map<string, number>();
  for (const scan of scans) {
    scanCountByBusiness.set(scan.businessId, (scanCountByBusiness.get(scan.businessId) ?? 0) + 1);
  }
  const latestScanByBusiness: ScanEvent[] = [];
  if (!filterBusinessId) {
    const seen = new Set<string>();
    for (const scan of scans) {
      if (seen.has(scan.businessId)) continue;
      seen.add(scan.businessId);
      latestScanByBusiness.push(scan);
    }
  }
  const rows = filterBusinessId ? scans : latestScanByBusiness;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Scans</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {filterBusinessId ? (
            <>
              {scans.length} scan{scans.length === 1 ? '' : 's'} for{' '}
              <span className="font-medium text-gray-700">{filterBusiness?.name ?? filterBusinessId}</span> —{' '}
              <Link href="/admin/scans" className="text-(--color-brand) hover:underline">
                clear filter
              </Link>
            </>
          ) : (
            <>
              {rows.length} business{rows.length === 1 ? '' : 'es'} with at least one scan. Click a business to see
              its full scan history.
            </>
          )}
        </p>
      </div>

      {loadError && (
        <div role="alert" className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {!loadError && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
          No scans yet. Run &quot;Enrich Website&quot; on a business with a website to create one.
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Business</th>
                <th className="px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Source URL</th>
                <th className="px-4 py-3 font-medium text-gray-600">Images</th>
                <th className="px-4 py-3 font-medium text-gray-600">Attempt</th>
                <th className="px-4 py-3 font-medium text-gray-600">Created</th>
                <th className="px-4 py-3 font-medium text-gray-600">Completed</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((scan) => {
                const accepted = scan.images?.filter((i) => i.status === 'accepted').length ?? 0;
                const total = scan.images?.length ?? 0;
                const businessName = businessNameById.get(scan.businessId);
                const scanCount = scanCountByBusiness.get(scan.businessId) ?? 1;
                return (
                  <tr key={scan.scanId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={
                          filterBusinessId
                            ? `/admin/businesses/${scan.businessId}`
                            : `/admin/scans?businessId=${scan.businessId}`
                        }
                        className="font-medium text-gray-900 hover:text-(--color-brand) hover:underline"
                      >
                        {businessName ?? scan.businessId}
                      </Link>
                      {!filterBusinessId && scanCount > 1 && (
                        <span className="ml-1.5 text-xs text-gray-400">· {scanCount} scans</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ScanTypeBadge scan={scan} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={scan.status} />
                      {scan.status === 'failed' && scan.failureCategory && (
                        <span className="ml-2 text-xs text-gray-400">{scan.failureCategory}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={scan.sourceUrl}>
                      {scan.sourceUrl ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {total > 0 ? `${accepted} accepted / ${total} found` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {scan.attempt}
                      {scan.retryOfScanId && <span className="ml-1 text-xs text-gray-400">(retry)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(scan.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {scan.completedAt ? new Date(scan.completedAt).toLocaleString() : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/scans/${scan.scanId}`}
                        className="text-(--color-brand) hover:underline text-xs font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
