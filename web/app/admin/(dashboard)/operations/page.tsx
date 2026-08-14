import Link from 'next/link';
import { aggregateNeedsAttention, RECOMMENDED_ACTION_LABELS, type NeedsAttentionItem, type OperationsRecommendedAction } from '@/lib/operations/needs-attention';
import { listRecentOperations } from '@/lib/operations/recent';
import { getUpcomingCredentialExpirations } from '@/lib/operations/credential-expirations';
import { resolveRuntimeEnvironment } from '@/lib/env/runtime-environment';
import { retryEnrichmentAction } from '../businesses/[businessId]/enrichment-actions';
import { markStaleScanFailedAction } from '../businesses/[businessId]/screenshot-actions';
import { rerunScanWorkflowAction, markStaleExecutionFailedAction } from '../businesses/[businessId]/workflow-actions';
import { retryLeadNotificationAction } from '../businesses/[businessId]/lead-actions';
import { retryRenderPostcardAction } from '../postcards/actions';

export const dynamic = 'force-dynamic';

/**
 * `retryRenderPostcardAction` returns `{ error?: string }` for its existing
 * client-side (`useTransition`) caller on the campaign page — incompatible
 * with a plain `<form action>`'s expected `void` return. This is a thin,
 * inline Server Action wrapper that discards the result; the page's own
 * `force-dynamic` re-fetch on the next render is what actually reflects
 * whether the retry worked, same as every redirect-based action elsewhere
 * on this page.
 */
async function retryRenderPostcardFormAction(postcardId: string): Promise<void> {
  'use server';
  await retryRenderPostcardAction(postcardId);
}

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

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
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
        <form action={retryRenderPostcardFormAction.bind(null, recovery.postcardId)}>
          <button type="submit" className="text-xs font-medium text-(--color-brand) hover:underline">
            Retry render
          </button>
        </form>
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

function NeedsAttentionCard({ item }: { item: NeedsAttentionItem }) {
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

export default async function OperationsPage() {
  const environment = resolveRuntimeEnvironment();

  let needsAttention: Awaited<ReturnType<typeof aggregateNeedsAttention>> = { items: [], screenshotDlqDepth: null };
  let recentOperations: Awaited<ReturnType<typeof listRecentOperations>> = [];
  let loadError: string | undefined;

  try {
    [needsAttention, recentOperations] = await Promise.all([aggregateNeedsAttention(), listRecentOperations()]);
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load operational status.';
  }

  const credentialWarnings = getUpcomingCredentialExpirations(environment);
  const issueCount = needsAttention.items.length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Operations</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Everything requiring attention across Webpresa&apos;s scans, postcards, leads, and webhooks — in one place.
        </p>
      </div>

      {loadError && (
        <div role="alert" className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

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
        {needsAttention.screenshotDlqDepth !== null && needsAttention.screenshotDlqDepth > 0 && (
          <p className="mt-1 text-xs text-gray-400">Screenshot dead-letter queue: {needsAttention.screenshotDlqDepth} message(s)</p>
        )}
      </div>

      {/* Credential expiration warnings — only rendered when non-empty */}
      {credentialWarnings.length > 0 && (
        <div className="mb-6 space-y-3">
          {credentialWarnings.map((warning) => (
            <div key={warning.name} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">Credential expiring soon</p>
              <p className="mt-1 text-sm text-amber-800">
                {warning.name} expires {new Date(warning.expiresAt).toLocaleDateString()} ({warning.daysRemaining} day
                {warning.daysRemaining === 1 ? '' : 's'})
              </p>
              {/* web/docs/operations.md is a repo document, not a served route — referenced by path, not linked, since this app has no docs viewer. */}
              <p className="mt-1 text-xs font-medium text-amber-700">Runbook: web/docs/operations.md{warning.runbookAnchor}</p>
            </div>
          ))}
        </div>
      )}

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
            {needsAttention.items.map((item) => (
              <NeedsAttentionCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Operations */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent Operations</h2>
        {recentOperations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            No recent activity yet.
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-50">
            {recentOperations.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-gray-700">
                  <span className="text-green-600 mr-1.5">✓</span>
                  {item.label}
                  {item.businessName && <span className="text-gray-400"> — {item.businessName}</span>}
                </span>
                <span className="text-xs text-gray-400">{formatRelativeTime(item.occurredAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
