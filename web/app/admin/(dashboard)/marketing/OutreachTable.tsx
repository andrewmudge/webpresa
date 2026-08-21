'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import type { OutreachRow } from '@/lib/marketing/dashboard';
import { describeNextAction } from '@/lib/marketing/next-action-label';
import { OutreachStatusBadge } from './OutreachStatusBadge';
import { pauseOutreachAction, resumeOutreachAction, suppressOutreachAction, cancelRemainingOutreachAction, sendNextEmailNowAction } from './outreach-actions';

function ConversionBadges({ row }: { row: OutreachRow }) {
  const { outreach, business, messages } = row;
  const engaged = outreach.lastEventType === 'engaged' || messages.some((m) => m.clickCount > 0);
  const claimed = Boolean(business?.claimedAt);
  const customer = business?.status === 'customer';

  const badges: Array<{ label: string; tone: string }> = [];
  if (engaged) badges.push({ label: 'Engaged', tone: 'bg-purple-50 text-purple-700' });
  if (claimed) badges.push({ label: 'Claimed', tone: 'bg-indigo-50 text-indigo-700' });
  if (customer) badges.push({ label: 'Customer', tone: 'bg-green-50 text-green-700' });

  if (badges.length === 0) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((badge) => (
        <span key={badge.label} className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.tone}`}>
          {badge.label}
        </span>
      ))}
    </div>
  );
}

function ManualControls({ row }: { row: OutreachRow }) {
  const { outreach } = row;
  const [confirmingSend, setConfirmingSend] = useState(false);
  const keyFields = (
    <>
      <input type="hidden" name="businessId" value={outreach.businessId} />
      <input type="hidden" name="marketingCampaignId" value={outreach.marketingCampaignId} />
    </>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {outreach.status === 'active' && (
        <form action={pauseOutreachAction}>
          {keyFields}
          <button type="submit" className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            Pause campaign
          </button>
        </form>
      )}
      {outreach.status === 'paused' && (
        <form action={resumeOutreachAction}>
          {keyFields}
          <button type="submit" className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            Resume campaign
          </button>
        </form>
      )}
      {(outreach.status === 'active' || outreach.status === 'paused') && (
        <>
          <form action={suppressOutreachAction}>
            {keyFields}
            <button type="submit" className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
              Suppress marketing
            </button>
          </form>
          <form action={cancelRemainingOutreachAction}>
            {keyFields}
            <button type="submit" className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
              Cancel remaining emails
            </button>
          </form>
          <form
            action={sendNextEmailNowAction}
            onSubmit={(event) => {
              if (!confirmingSend) {
                event.preventDefault();
                setConfirmingSend(true);
              }
            }}
          >
            {keyFields}
            <button
              type="submit"
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                confirmingSend ? 'border-(--color-brand) text-(--color-brand) bg-blue-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {confirmingSend ? 'Confirm send now?' : 'Send Next Email Now'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function OutreachDetail({ row }: { row: OutreachRow }) {
  const { outreach, messages } = row;
  return (
    <div className="bg-gray-50 border-t border-gray-100 px-4 py-4 space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Timeline</p>
        <ul className="space-y-1.5 text-xs text-gray-700">
          <li>
            <span className="text-gray-400">{new Date(outreach.createdAt).toLocaleString()}</span> — Postcard delivered, enrolled in campaign
          </li>
          {messages.map((message) => (
            <li key={message.sortKey}>
              <span className="text-gray-400">{new Date(message.attemptedAt).toLocaleString()}</span> — Email {message.emailSequence}{' '}
              {message.outcome === 'sent' ? (
                <>
                  sent{message.sesEventStatus ? ` (${message.sesEventStatus})` : ''}
                  {message.clickCount > 0 ? ` · ${message.clickCount} click${message.clickCount === 1 ? '' : 's'}` : ''}
                </>
              ) : (
                `skipped (${message.skipReason ?? 'ineligible'})`
              )}
            </li>
          ))}
          {outreach.status === 'suppressed' && (
            <li>
              <span className="text-gray-400">{new Date(outreach.updatedAt).toLocaleString()}</span> — Suppressed ({outreach.suppressionReason})
            </li>
          )}
        </ul>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Admin controls</p>
        <ManualControls row={row} />
      </div>
    </div>
  );
}

/** Client-side instant name search over the currently-loaded rows — mirrors `BusinessTable.tsx`'s exact split (server-side status filter via `FilterBar`, client-side name search here). */
export function OutreachTable({ rows }: { rows: OutreachRow[] }) {
  const [query, setQuery] = useState('');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const business = row.business;
      return (
        business?.name.toLowerCase().includes(q) ||
        business?.businessId.toLowerCase().includes(q) ||
        business?.email?.toLowerCase().includes(q) ||
        row.outreach.postcardId.toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by business name, email, business ID, or postcard ID…"
          aria-label="Search outreach"
          className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
        />
        {query && (
          <p className="mt-1.5 text-xs text-gray-400">
            {visible.length} of {rows.length} loaded rows match &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-center py-12 text-sm text-gray-400">No outreach matches that search.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">Business</th>
              <th className="px-4 py-3 font-medium text-gray-600">Postcard</th>
              <th className="px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="px-4 py-3 font-medium text-gray-600">Next Action</th>
              <th className="px-4 py-3 font-medium text-gray-600">Conversion</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.map((row) => {
              const key = `${row.outreach.businessId}#${row.outreach.marketingCampaignId}`;
              const expanded = expandedKey === key;
              return (
                <Fragment key={key}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      {row.business ? (
                        <Link href={`/admin/businesses/${row.business.businessId}`} className="font-medium text-gray-900 hover:text-(--color-brand) hover:underline">
                          {row.business.name}
                        </Link>
                      ) : (
                        <span className="text-gray-400">Unknown business</span>
                      )}
                      <p className="text-xs text-gray-400">
                        {row.business?.address?.city ? `${row.business.address.city}, ${row.business.address.state}` : row.outreach.businessId}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      <p>Delivered {new Date(row.outreach.deliveredAt).toLocaleDateString()}</p>
                      <p className="text-gray-400">{row.outreach.postcardId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <OutreachStatusBadge status={row.outreach.status} />
                      <p className="text-xs text-gray-400 mt-0.5">Step {row.outreach.currentSequence} of 3</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{describeNextAction(row.outreach, row.business)}</td>
                    <td className="px-4 py-3">
                      <ConversionBadges row={row} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setExpandedKey(expanded ? null : key)}
                        className="text-xs text-(--color-brand) hover:underline"
                      >
                        {expanded ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <OutreachDetail row={row} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
