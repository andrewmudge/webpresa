'use server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { startScanWorkflow, rerunScanWorkflow } from '@/lib/workflow/run-scan-workflow';
import { markStaleExecutionFailed } from '@/lib/workflow/stale';

/**
 * Stage 16 (Step Functions Scan and Preview Workflow) admin actions — kept in
 * their own module following this directory's established one-concern-per-file
 * split (see `enrichment-actions.ts`, `screenshot-actions.ts`, `scoring-actions.ts`).
 *
 * The browser never calls Step Functions directly — these actions are the
 * only server-side entry point that does, per implementation.md, Stage 16,
 * "Admin trigger".
 */

function outcomeQueryParam(status: string): string {
  return `?workflowResult=${encodeURIComponent(status)}`;
}

export async function runScanWorkflowAction(businessId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const outcome = await startScanWorkflow(businessId, session.sub);
  redirect(`/admin/businesses/${businessId}${outcomeQueryParam(outcome.status)}`);
}

export async function rerunScanWorkflowAction(businessId: string, previousScanExecutionId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const outcome = await rerunScanWorkflow(businessId, previousScanExecutionId, session.sub, 'Rerun requested by admin');
  redirect(`/admin/businesses/${businessId}${outcomeQueryParam(outcome.status)}`);
}

/**
 * Stage 24 — admin override for a `ScanExecution` stuck past the staleness
 * threshold (see `lib/workflow/stale.ts`'s `isStaleExecution`), mirroring
 * `screenshot-actions.ts`'s `markStaleScanFailedAction` for `ScanEvent`.
 */
export async function markStaleExecutionFailedAction(businessId: string, scanExecutionId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const outcome = await markStaleExecutionFailed(businessId, scanExecutionId);
  redirect(`/admin/businesses/${businessId}${outcomeQueryParam(outcome.status)}`);
}
