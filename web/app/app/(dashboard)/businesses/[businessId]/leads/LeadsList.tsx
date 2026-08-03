'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Lead } from '@/domain/models/lead';
import { formatDateTime } from '../billing/status';
import { markLeadReadActionCustomer, archiveLeadActionCustomer } from './actions';

type Filter = 'inbox' | 'all' | 'archived';

const FILTER_LABEL: Record<Filter, string> = { inbox: 'Inbox', all: 'All', archived: 'Archived' };

export function LeadsList({ businessId, leads, isReadOnly }: { businessId: string; leads: Lead[]; isReadOnly: boolean }) {
  const [filter, setFilter] = useState<Filter>('inbox');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const visible = leads.filter((lead) => {
    if (filter === 'all') return true;
    if (filter === 'archived') return lead.status === 'archived';
    return lead.status !== 'archived';
  });

  function handleMarkRead(leadId: string) {
    startTransition(async () => {
      await markLeadReadActionCustomer(businessId, leadId);
      router.refresh();
    });
  }

  function handleArchive(leadId: string) {
    startTransition(async () => {
      await archiveLeadActionCustomer(businessId, leadId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(Object.keys(FILTER_LABEL) as Filter[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === tab ? 'bg-(--color-brand) text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {FILTER_LABEL[tab]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-sm text-gray-500">No leads here yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 bg-white rounded-2xl border border-gray-200 shadow-sm">
          {visible.map((lead) => (
            <li key={lead.leadId} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{lead.name}</p>
                    {lead.status === 'new' && (
                      <span className="inline-flex items-center rounded-full bg-(--color-brand-muted) px-2 py-0.5 text-[10px] font-semibold text-(--color-brand)">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    <time dateTime={lead.createdAt}>{formatDateTime(lead.createdAt) ?? ''}</time>
                  </p>
                  <div className="mt-2 space-y-0.5 text-sm text-gray-700">
                    {lead.phone && <p>{lead.phone}</p>}
                    {lead.email && <p>{lead.email}</p>}
                    {lead.serviceNeeded && <p className="font-medium">{lead.serviceNeeded}</p>}
                    {lead.message && <p className="text-gray-500 whitespace-pre-wrap">{lead.message}</p>}
                  </div>
                </div>
                {!isReadOnly && lead.status !== 'archived' && (
                  <div className="flex shrink-0 gap-2">
                    {lead.status === 'new' && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleMarkRead(lead.leadId)}
                        className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleArchive(lead.leadId)}
                      className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Archive
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
