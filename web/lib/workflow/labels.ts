import type { ScanWorkflowStatus } from '@/domain/models/scan-execution';

/**
 * Shared display strings for `ScanWorkflowStatus` — the single source of
 * truth for the business detail page's `WorkflowSection.tsx`, mirroring
 * `lib/scoring/labels.ts`'s `QUALIFICATION_LABELS`/`QUALIFICATION_TONE`
 * precedent so wording/colors can't drift if a second view is added later.
 */

export const SCAN_WORKFLOW_STATUS_LABELS: Record<ScanWorkflowStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  manual_review: 'Manual Review',
  qualified: 'Qualified',
  reject: 'Reject',
  preview_ready: 'Preview Ready',
  failed: 'Failed',
};

export const SCAN_WORKFLOW_STATUS_TONE: Record<ScanWorkflowStatus, string> = {
  queued: 'bg-gray-50 text-gray-700 border-gray-200',
  running: 'bg-blue-50 text-blue-700 border-blue-200',
  manual_review: 'bg-amber-50 text-amber-700 border-amber-200',
  qualified: 'bg-green-50 text-green-700 border-green-200',
  reject: 'bg-red-50 text-red-700 border-red-200',
  preview_ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
};

/** A workflow is "in flight" while queued/running — used to drive the auto-refresh polling component, mirroring Stage 14's `hasActiveScan` check. */
export function isActiveWorkflowStatus(status: ScanWorkflowStatus): boolean {
  return status === 'queued' || status === 'running';
}
