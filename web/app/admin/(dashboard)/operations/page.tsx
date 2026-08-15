import { aggregateNeedsAttention } from '@/lib/operations/needs-attention';
import { listRecentOperations } from '@/lib/operations/recent';
import { getUpcomingCredentialExpirations } from '@/lib/operations/credential-expirations';
import { resolveRuntimeEnvironment } from '@/lib/env/runtime-environment';
import { formatRelativeTime } from '@/lib/operations/format-relative-time';
import { NeedsAttentionSection } from './NeedsAttentionSection';

export const dynamic = 'force-dynamic';

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

      {/* System Status + Needs Attention — a client component so "Dismiss"
          can remove a card immediately, without waiting for the next
          server render. See NeedsAttentionSection.tsx. */}
      <NeedsAttentionSection items={needsAttention.items} screenshotDlqDepth={needsAttention.screenshotDlqDepth} />

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
