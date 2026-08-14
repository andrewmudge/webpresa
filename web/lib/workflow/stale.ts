import 'server-only';
import type { ScanExecution } from '@/domain/models/scan-execution';
import { listScanExecutionsForBusiness, claimScanExecutionStatus } from '@/lib/db/scan-executions';

/**
 * Stage 24 — stale-execution detection for `ScanExecution`, mirroring
 * `lib/screenshots/capture.ts`'s `isStaleScan`/`markStaleScanFailed` for
 * `ScanEvent`. `ScanExecution` previously had no staleness concept at all —
 * a Step Functions execution that silently died without ever reaching
 * `RecordFailure` (e.g. the execution itself was stopped or timed out at the
 * AWS level) left the DynamoDB record stuck `queued`/`running` forever, with
 * no admin-visible recovery path. Checked on page render, same as
 * `isStaleScan` — no cron, no background job.
 *
 * Threshold is set above the workflow's own bounded screenshot-completion
 * poll (~10 minutes — see architecture.md, "Screenshot completion — polled,
 * not pushed") plus headroom for the crawl/score/generate steps that run
 * before and after it, so a legitimately still-running execution is never
 * misclassified as stale.
 */
export const STALE_EXECUTION_THRESHOLD_MS = 20 * 60 * 1000;

export function isStaleExecution(execution: ScanExecution): boolean {
  if (execution.status !== 'queued' && execution.status !== 'running') return false;
  return Date.now() - new Date(execution.createdAt).getTime() > STALE_EXECUTION_THRESHOLD_MS;
}

export interface MarkStaleExecutionOutcome {
  status: 'marked_failed' | 'not_eligible' | 'failed';
  message?: string;
}

/**
 * Admin override for a `ScanExecution` stuck past the staleness threshold —
 * marks it `failed` via the existing atomic `claimScanExecutionStatus`
 * conditional transition (never a blind overwrite), so a fresh rerun can be
 * started through the existing `rerunScanWorkflow`. Re-validates staleness
 * server-side rather than trusting the UI that offered the button.
 */
export async function markStaleExecutionFailed(businessId: string, scanExecutionId: string): Promise<MarkStaleExecutionOutcome> {
  const executions = await listScanExecutionsForBusiness(businessId);
  const execution = executions.find((e) => e.scanExecutionId === scanExecutionId);
  if (!execution) return { status: 'failed', message: 'Scan execution not found.' };
  if (!isStaleExecution(execution)) return { status: 'not_eligible', message: 'This scan execution is not yet stale.' };

  const claimed = await claimScanExecutionStatus({
    scanExecutionId,
    expectedCurrentStatus: execution.status,
    updates: {
      status: 'failed',
      failure: {
        step: execution.currentStep ?? 'initializing',
        category: 'internal',
        safeMessage: 'Marked failed by an admin after exceeding the staleness threshold with no response from the workflow.',
        occurredAt: new Date().toISOString(),
        attemptCount: 1,
        retryEligible: true,
      },
      completedAt: new Date().toISOString(),
    },
  });

  if (!claimed) {
    return { status: 'not_eligible', message: 'This scan execution changed status before it could be marked failed.' };
  }
  return { status: 'marked_failed' };
}
