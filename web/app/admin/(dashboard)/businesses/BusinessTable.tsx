'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Business } from '@/domain/models/business';
import { QUALIFICATION_LABELS, QUALIFICATION_TONE } from '@/lib/scoring/labels';
import { DeleteBusinessRowButton } from './DeleteBusinessRowButton';
import { StatusBadge } from './StatusBadge';

/**
 * Client-side name search over the currently-loaded page of businesses
 * (up to `limit` items, already narrowed server-side by any active
 * `FilterBar` filters). Instant, zero-cost, but intentionally doesn't
 * reach beyond the loaded page/cursor — a business on a later page won't
 * show up until it's loaded via "Load more" or a filter narrows enough
 * for it to land on this page.
 */
export function BusinessTable({ items }: { items: Business[] }) {
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((b) => b.name.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          aria-label="Search businesses by name"
          className="w-full max-w-sm rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
        />
        {query && (
          <p className="mt-1.5 text-xs text-gray-400">
            {visible.length} of {items.length} loaded businesses match &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-center py-12 text-sm text-gray-400">No loaded businesses match that search.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 font-medium text-gray-600">Location</th>
              <th className="px-4 py-3 font-medium text-gray-600">Industry</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Source</th>
              <th className="px-4 py-3 font-medium text-gray-600">Created</th>
              <th className="px-4 py-3 font-medium text-gray-600">Score</th>
              <th className="px-4 py-3 font-medium text-gray-600">Qualification</th>
              <th className="px-4 py-3 font-medium text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.map((b) => (
              <BusinessRow key={b.businessId} business={b} />
            ))}
          </tbody>
        </table>
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
      </td>
      <td className="px-4 py-3 text-gray-600">
        {b.address?.city ? `${b.address.city}, ${b.address.state}` : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-4 py-3 text-gray-600">{b.industry.replace('_', ' ')}</td>
      <td className="px-4 py-3">
        <StatusBadge status={b.status} />
      </td>
      <td className="px-4 py-3 text-gray-600">{b.source}</td>
      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(b.createdAt).toLocaleDateString()}</td>
      <td className="px-4 py-3">
        <ScoreCell business={b} />
      </td>
      <td className="px-4 py-3">
        <QualificationCell business={b} />
      </td>
      <td className="px-4 py-3 text-right">
        <DeleteBusinessRowButton businessId={b.businessId} businessName={b.name} />
      </td>
    </tr>
  );
}

/** Admin override always wins for display, matching `ScoringSection.tsx`'s "authoritative for prioritization" treatment — the original AI value is never lost, just not shown here when an override exists. */
function ScoreCell({ business: b }: { business: Business }) {
  const score = b.adminReviewedScore ?? b.websiteQualityScore;
  if (score === undefined) return <span className="text-gray-300">—</span>;
  return (
    <span className="text-gray-900" title={b.adminReviewedScore !== undefined ? 'Admin override' : undefined}>
      {score}
    </span>
  );
}

function QualificationCell({ business: b }: { business: Business }) {
  const qualification = b.adminReviewedQualification ?? b.qualification;
  if (!qualification) return <span className="text-gray-300">—</span>;
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${QUALIFICATION_TONE[qualification]}`}
      title={b.adminReviewedQualification ? 'Admin override' : undefined}
    >
      {QUALIFICATION_LABELS[qualification]}
    </span>
  );
}
