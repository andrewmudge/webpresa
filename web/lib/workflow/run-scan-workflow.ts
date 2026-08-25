import 'server-only';
import { StartExecutionCommand } from '@aws-sdk/client-sfn';
import { getStepFunctionsClient, getScanWorkflowStateMachineArn } from '@/lib/stepfunctions/client';
import { getBusinessById } from '@/lib/db/businesses';
import { listScanExecutionsForBusiness, putScanExecution } from '@/lib/db/scan-executions';
import { createScanExecution } from '@/domain/factories/scan-execution.factory';
import type { ScanExecution, ScanWorkflowTriggerSource } from '@/domain/models/scan-execution';
import { log } from '@/lib/logging/log';

/**
 * Stage 16 — starts (or reruns) the scan workflow for a business. Creates a
 * `queued` `ScanExecution` and starts the Step Functions Standard execution;
 * the workflow's own first state (`InitializeScanExecution`) claims
 * `queued → running` — this function never sets `running` itself, matching
 * the same "create queued, let the worker claim it" shape `enrichBusinessWebsite`/
 * `captureExistingSiteScreenshot` already use for `ScanEvent`.
 */

export const SCAN_WORKFLOW_CONFLICT_MESSAGE = 'A scan workflow for this business is already queued or running.';

export interface StartScanWorkflowOutcome {
  status: 'started' | 'conflict' | 'failed';
  scanExecutionId?: string;
  /** Safe, admin-facing summary — never a raw AWS SDK error. */
  message?: string;
}

function hasActiveExecution(executions: ScanExecution[]): boolean {
  return executions.some((e) => e.status === 'queued' || e.status === 'running');
}

async function startExecution(execution: ScanExecution, businessId: string): Promise<StartScanWorkflowOutcome> {
  const client = getStepFunctionsClient();

  try {
    const result = await client.send(
      new StartExecutionCommand({
        stateMachineArn: getScanWorkflowStateMachineArn(),
        name: execution.scanExecutionId,
        input: JSON.stringify({ businessId, scanExecutionId: execution.scanExecutionId }),
      }),
    );
    await putScanExecution({
      ...execution,
      executionArn: result.executionArn,
      executionName: execution.scanExecutionId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start the scan workflow.';
    await putScanExecution({
      ...execution,
      status: 'failed',
      failure: {
        step: 'initializing',
        category: 'internal',
        safeMessage: 'Could not start the Step Functions execution.',
        occurredAt: new Date().toISOString(),
        attemptCount: 1,
        retryEligible: true,
      },
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    log({
      level: 'error',
      event: 'scan.workflow.start_failed',
      component: 'scan-workflow',
      businessId,
      scanExecutionId: execution.scanExecutionId,
      provider: 'internal',
      operation: 'initializing',
      errorCategory: 'internal',
      retryable: true,
      attempt: execution.attemptNumber,
      message,
    });
    return { status: 'failed', scanExecutionId: execution.scanExecutionId, message };
  }

  log({
    event: 'scan.workflow.started',
    component: 'scan-workflow',
    businessId,
    scanExecutionId: execution.scanExecutionId,
    status: 'running',
    attempt: execution.attemptNumber,
  });
  return { status: 'started', scanExecutionId: execution.scanExecutionId };
}

/**
 * Starts a fresh scan workflow for a business. Safe to call whether or not a
 * prior execution exists — creates a brand-new `ScanExecution`.
 *
 * `triggerSource` defaults to `'admin_manual'` (every existing caller passes
 * only two arguments) — the self-service build orchestration
 * (`lib/build/start-self-service-build.ts`) is the one caller that passes
 * `'self_service'` explicitly, with `requestedBy` set to the businessId
 * itself rather than an admin username, since there is no admin session
 * behind that trigger.
 */
export async function startScanWorkflow(
  businessId: string,
  requestedBy: string,
  triggerSource: ScanWorkflowTriggerSource = 'admin_manual',
): Promise<StartScanWorkflowOutcome> {
  const business = await getBusinessById(businessId);
  if (!business) return { status: 'failed', message: 'Business not found.' };

  const existing = await listScanExecutionsForBusiness(businessId);
  if (hasActiveExecution(existing)) {
    return { status: 'conflict', message: SCAN_WORKFLOW_CONFLICT_MESSAGE };
  }

  const execution = createScanExecution({ businessId, triggerSource, requestedBy });
  await putScanExecution(execution);

  return startExecution(execution, businessId);
}

/**
 * Reruns a failed, rejected, or manual-review scan workflow. Always creates
 * a brand-new `ScanExecution` (`parentScanExecutionId` + `attemptNumber + 1`)
 * — the prior terminal `ScanExecution` is never mutated back to `queued`,
 * mirroring `retryEnrichmentScan`'s existing pattern for `ScanEvent`.
 */
export async function rerunScanWorkflow(
  businessId: string,
  previousScanExecutionId: string,
  requestedBy: string,
  rerunReason?: string,
): Promise<StartScanWorkflowOutcome> {
  const business = await getBusinessById(businessId);
  if (!business) return { status: 'failed', message: 'Business not found.' };

  const existing = await listScanExecutionsForBusiness(businessId);
  // Covers both "some unrelated execution is active" and "the execution
  // being rerun is itself still queued/running" — `previous` is drawn from
  // this same list, so a not-yet-finished `previous` always already trips
  // this check first; there is no separate case left to distinguish.
  if (hasActiveExecution(existing)) {
    return { status: 'conflict', message: SCAN_WORKFLOW_CONFLICT_MESSAGE };
  }

  const previous = existing.find((e) => e.scanExecutionId === previousScanExecutionId);
  if (!previous) return { status: 'failed', message: 'Prior scan execution not found.' };

  const execution = createScanExecution({
    businessId,
    triggerSource: 'admin_manual',
    requestedBy,
    parentScanExecutionId: previous.scanExecutionId,
    attemptNumber: previous.attemptNumber + 1,
    ...(rerunReason !== undefined ? { rerunReason } : {}),
  });
  await putScanExecution(execution);

  return startExecution(execution, businessId);
}
