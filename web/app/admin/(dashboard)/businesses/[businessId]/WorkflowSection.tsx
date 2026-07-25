import type { Business } from '@/domain/models/business';
import type { ScanExecution } from '@/domain/models/scan-execution';
import { SCAN_WORKFLOW_STATUS_LABELS, SCAN_WORKFLOW_STATUS_TONE, isActiveWorkflowStatus } from '@/lib/workflow/labels';
import { QUALIFICATION_LABELS } from '@/lib/scoring/labels';
import { runScanWorkflowAction, rerunScanWorkflowAction } from './workflow-actions';
import { WorkflowAutoRefresh } from './WorkflowAutoRefresh';
import { WorkflowResultBanner } from './WorkflowResultBanner';

/**
 * Stage 16 (Step Functions Scan and Preview Workflow) admin card — the
 * orchestration "front door" that sequences Firecrawl enrichment (Stage 13),
 * Playwright screenshots (Stage 14), and AI scoring (Stage 15) in one
 * Step Functions execution, rather than the admin triggering each stage's
 * card below independently. Mirrors `ScreenshotsSection`'s shape (plain
 * server component, redirect + query-param result banner, a client
 * component polling for the out-of-band result).
 */

interface Props {
  business: Business;
  executions: ScanExecution[]; // newest first
  resultQuery?: string;
}

export function WorkflowSection({ business, executions, resultQuery }: Props) {
  const latest = executions[0];
  const active = !!latest && isActiveWorkflowStatus(latest.status);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <WorkflowAutoRefresh active={active} />
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Scan Workflow</h3>
        {latest && (
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium border ${SCAN_WORKFLOW_STATUS_TONE[latest.status]}`}
          >
            {SCAN_WORKFLOW_STATUS_LABELS[latest.status]}
          </span>
        )}
      </div>

      {resultQuery && <WorkflowResultBanner result={resultQuery} />}

      {latest ? (
        <div className="text-sm space-y-1">
          <div className="text-gray-900">
            {latest.currentStep ? `Step: ${latest.currentStep.replace(/_/g, ' ')}` : 'Not yet started'}
            {' — '}
            {new Date(latest.updatedAt).toLocaleString()}
          </div>
          {latest.qualification && (
            <div className="text-gray-600">
              Qualification: {QUALIFICATION_LABELS[latest.qualification]}
              {latest.leadPriority ? ` · Lead priority: ${latest.leadPriority}` : ''}
            </div>
          )}
          {latest.manualReviewReason && <div className="text-xs text-amber-700">{latest.manualReviewReason}</div>}
          {latest.failure && <div className="text-xs text-red-600">{latest.failure.safeMessage}</div>}
          <div className="text-xs text-gray-400">Attempt {latest.attemptNumber}</div>
        </div>
      ) : (
        <p className="text-sm text-gray-400">Never run</p>
      )}

      <div className="flex items-center gap-3">
        <form action={runScanWorkflowAction.bind(null, business.businessId)}>
          <button
            type="submit"
            disabled={active}
            className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {active ? 'Running…' : 'Run full scan'}
          </button>
        </form>

        {latest && !active && (
          <form action={rerunScanWorkflowAction.bind(null, business.businessId, latest.scanExecutionId)}>
            <button
              type="submit"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Rerun
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
