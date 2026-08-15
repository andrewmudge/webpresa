'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { NeedsAttentionItem, OperationsRecommendedAction } from '@/lib/operations/needs-attention-types';
import { RECOMMENDED_ACTION_LABELS } from '@/lib/operations/needs-attention-types';
import { formatRelativeTime } from '@/lib/operations/format-relative-time';
import { retryEnrichmentAction } from '../businesses/[businessId]/enrichment-actions';
import { markStaleScanFailedAction } from '../businesses/[businessId]/screenshot-actions';
import { rerunScanWorkflowAction, markStaleExecutionFailedAction } from '../businesses/[businessId]/workflow-actions';
import { retryLeadNotificationAction } from '../businesses/[businessId]/lead-actions';
import { retryRenderPostcardAction } from '../postcards/actions';
import { dismissNeedsAttentionItemAction } from './actions';

/**
 * Client component so a "Dismiss" click can remove the card immediately —
 * a plain `<form action>` Server Action only reflects on the *next*
 * server render (a full page reload, or whatever triggers one), which felt
 * laggy in practice. Renders the same System Status + Needs Attention
 * sections `page.tsx` (a Server Component) used to render directly;
 * `page.tsx` now just fetches the data and hands it to this component.
 *
 * The recovery actions below (retry/rerun/mark-stale) are unchanged —
 * still plain `<form action>` submissions that redirect to the affected
 * business page, which is the correct, expected behavior for those. Only
 * Dismiss needed the optimistic local-state treatment.
 */

const RECOMMENDED_ACTION_STYLES: Record<OperationsRecommendedAction, string> = {
  safe_retry: 'bg-green-50 text-green-700',
  requires_configuration_fix: 'bg-red-50 text-red-700',
  requires_manual_review: 'bg-amber-50 text-amber-700',
  investigate: 'bg-gray-100 text-gray-600',
};

function RecommendedActionBadge({ action }: { action: OperationsRecommendedAction }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RECOMMENDED_ACTION_STYLES[action]}`}>
      {RECOMMENDED_ACTION_LABELS[action]}
    </span>
  );
}

/** Renders the bound recovery-action button for one item, if a safe one exists — never a button for anything else. */
function RecoveryButton({ recovery }: { recovery: NonNullable<NeedsAttentionItem['recovery']> }) {
  switch (recovery.kind) {
    case 'retry_enrichment':
      return (
        <form action={retryEnrichmentAction.bind(null, recovery.businessId, recovery.scanId)}>
          <button type="submit" className="text-xs font-medium text-(--color-brand) hover:underline">
            Retry
          </button>
        </form>
      );
    case 'mark_stale_scan_failed':
      return (
        <form action={markStaleScanFailedAction.bind(null, recovery.businessId, recovery.scanId)}>
          <button type="submit" className="text-xs font-medium text-(--color-brand) hover:underline">
            Mark as failed
          </button>
        </form>
      );
    case 'mark_stale_execution_failed':
      return (
        <form action={markStaleExecutionFailedAction.bind(null, recovery.businessId, recovery.scanExecutionId)}>
          <button type="submit" className="text-xs font-medium text-(--color-brand) hover:underline">
            Mark as failed
          </button>
        </form>
      );
    case 'rerun_scan_workflow':
      return (
        <form action={rerunScanWorkflowAction.bind(null, recovery.businessId, recovery.scanExecutionId)}>
          <button type="submit" className="text-xs font-medium text-(--color-brand) hover:underline">
            Rerun
          </button>
        </form>
      );
    case 'retry_render_postcard':
      return (
        <button
          type="button"
          className="text-xs font-medium text-(--color-brand) hover:underline"
          onClick={() => {
            void retryRenderPostcardAction(recovery.postcardId);
          }}
        >
          Retry render
        </button>
      );
    case 'retry_lead_notification':
      return (
        <form action={retryLeadNotificationAction.bind(null, recovery.businessId, recovery.leadId)}>
          <button type="submit" className="text-xs font-medium text-(--color-brand) hover:underline">
            Retry notification
          </button>
        </form>
      );
  }
}

/**
 * Dismisses one item from the queue — a snooze, not a delete (see
 * `lib/db/operations-dismissals.ts`). `onDismiss` hides the card
 * immediately, before the server call resolves; the write itself happens
 * in the background. If it fails, the item simply reappears on the next
 * real page load rather than staying hidden forever silently — acceptable
 * for a low-stakes "I've seen this" action.
 */
function DismissButton({ itemId, onDismiss }: { itemId: string; onDismiss: (itemId: string) => void }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      className="text-xs font-medium text-gray-400 hover:text-gray-600 disabled:opacity-50"
      title="Hide this from the queue for ~30 days"
      onClick={() => {
        onDismiss(itemId);
        startTransition(() => {
          void dismissNeedsAttentionItemAction(itemId);
        });
      }}
    >
      Dismiss
    </button>
  );
}

function NeedsAttentionCard({ item, onDismiss }: { item: NeedsAttentionItem; onDismiss: (itemId: string) => void }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-gray-900">{item.title}</p>
          {item.businessName && (
            <Link href={`/admin/businesses/${item.businessId}`} className="text-sm text-(--color-brand) hover:underline">
              {item.businessName}
            </Link>
          )}
          {item.detail && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{item.detail}</p>}
          <p className="mt-1 text-xs text-gray-400">{formatRelativeTime(item.occurredAt)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <RecommendedActionBadge action={item.recommendedAction} />
          <div className="flex items-center gap-3">
            {item.businessId && (
              <Link href={`/admin/businesses/${item.businessId}`} className="text-xs font-medium text-gray-500 hover:text-gray-700 hover:underline">
                View Business
              </Link>
            )}
            {item.recovery && <RecoveryButton recovery={item.recovery} />}
            <DismissButton itemId={item.id} onDismiss={onDismiss} />
          </div>
        </div>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">Details</summary>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 sm:grid-cols-3">
          {item.provider && (
            <div>
              <dt className="text-gray-400">Provider</dt>
              <dd className="text-gray-700">{item.provider}</dd>
            </div>
          )}
          {item.operation && (
            <div>
              <dt className="text-gray-400">Operation</dt>
              <dd className="text-gray-700">{item.operation}</dd>
            </div>
          )}
          {item.errorCategory && (
            <div>
              <dt className="text-gray-400">Error category</dt>
              <dd className="text-gray-700">{item.errorCategory}</dd>
            </div>
          )}
          {item.attempt !== undefined && (
            <div>
              <dt className="text-gray-400">Attempt</dt>
              <dd className="text-gray-700">{item.attempt}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-400">Retryable</dt>
            <dd className="text-gray-700">{item.retryable === undefined ? '—' : item.retryable ? 'Yes' : 'No'}</dd>
          </div>
          {item.scanId && (
            <div>
              <dt className="text-gray-400">Scan ID</dt>
              <dd className="text-gray-700 truncate">{item.scanId}</dd>
            </div>
          )}
          {item.scanExecutionId && (
            <div>
              <dt className="text-gray-400">Execution ID</dt>
              <dd className="text-gray-700 truncate">{item.scanExecutionId}</dd>
            </div>
          )}
          {item.postcardId && (
            <div>
              <dt className="text-gray-400">Postcard ID</dt>
              <dd className="text-gray-700 truncate">{item.postcardId}</dd>
            </div>
          )}
          {item.leadId && (
            <div>
              <dt className="text-gray-400">Lead ID</dt>
              <dd className="text-gray-700 truncate">{item.leadId}</dd>
            </div>
          )}
        </dl>
      </details>
    </div>
  );
}

export function NeedsAttentionSection({ items, screenshotDlqDepth }: { items: NeedsAttentionItem[]; screenshotDlqDepth: number | null }) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const visibleItems = items.filter((item) => !hiddenIds.has(item.id));
  const issueCount = visibleItems.length;

  function handleDismiss(itemId: string) {
    setHiddenIds((prev) => new Set(prev).add(itemId));
  }

  return (
    <>
      {/* System Status */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">System Status</h2>
        {issueCount === 0 ? (
          <p className="flex items-center gap-2 text-sm text-green-700">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            All systems operational
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-amber-700">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            {issueCount} issue{issueCount === 1 ? '' : 's'} require attention
          </p>
        )}
        {screenshotDlqDepth !== null && screenshotDlqDepth > 0 && (
          <p className="mt-1 text-xs text-gray-400">Screenshot dead-letter queue: {screenshotDlqDepth} message(s)</p>
        )}
      </div>

      {/* Needs Attention */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Needs Attention {issueCount > 0 && <span className="text-gray-400 font-normal">({issueCount})</span>}
        </h2>
        {issueCount === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            Nothing needs your attention.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleItems.map((item) => (
              <NeedsAttentionCard key={item.id} item={item} onDismiss={handleDismiss} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
