import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { SaveButton } from './FormBits';
import type { OverviewActionItem } from './overview-status';
import { publishDraftActionCustomer } from './actions';
import { createBillingPortalSessionAction } from '@/app/account/checkout/actions';

/** Only rendered (by returning non-null) when at least one real actionable item exists — no empty-state panel. */
export function ActionRequiredCard({ businessId, items }: { businessId: string; items: OverviewActionItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-900">Action Required</h2>
      <div className="mt-3 divide-y divide-gray-100">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3">
            <div className="flex items-start gap-2 min-w-0">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
            </div>
            <div className="shrink-0">
              {item.action.kind === 'publish' && (
                <form action={publishDraftActionCustomer.bind(null, businessId)}>
                  <input type="hidden" name="previewId" value={item.action.previewId} />
                  <SaveButton label={item.actionLabel} pendingLabel="Publishing…" fullWidthOnMobile />
                </form>
              )}
              {item.action.kind === 'billing_portal' && (
                <form action={createBillingPortalSessionAction.bind(null, businessId)}>
                  <SaveButton label={item.actionLabel} pendingLabel="Opening Stripe…" fullWidthOnMobile />
                </form>
              )}
              {item.action.kind === 'link' && (
                <Link
                  href={item.action.href}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-1 rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
                >
                  {item.actionLabel}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
