import type { ScanExecution, ScanWorkflowTriggerSource } from '@/domain/models/scan-execution';
import { ScanExecutionSchema } from '@/domain/schemas/scan-execution.schema';
import { generateId, nowIso } from './utils';

export interface CreateScanExecutionInput {
  businessId: string;
  triggerSource: ScanWorkflowTriggerSource;
  /** Admin username — see `lib/auth/session.ts`'s `SessionPayload.sub`. */
  requestedBy: string;
  /** Set only when this execution reruns a prior terminal one. */
  parentScanExecutionId?: string;
  rerunReason?: string;
  /** Defaults to 1 for a first run; the caller increments this on a rerun. */
  attemptNumber?: number;
}

/**
 * Create a new ScanExecution record in `'queued'` status.
 *
 * The admin trigger action creates this, then starts the Step Functions
 * execution, then immediately persists the returned `executionArn`/
 * `executionName` back onto it (still `'queued'` — the workflow's own first
 * state claims `queued → running`). A rerun never mutates a prior
 * ScanExecution — it always creates a new one via this factory with
 * `parentScanExecutionId` set and `attemptNumber` incremented.
 */
export function createScanExecution(input: CreateScanExecutionInput): ScanExecution {
  const now = nowIso();

  const record: ScanExecution = {
    scanExecutionId: generateId('scanexec_'),
    businessId: input.businessId,
    status: 'queued',
    triggerSource: input.triggerSource,
    requestedBy: input.requestedBy,
    attemptNumber: input.attemptNumber ?? 1,
    ...(input.parentScanExecutionId !== undefined && { parentScanExecutionId: input.parentScanExecutionId }),
    ...(input.rerunReason !== undefined && { rerunReason: input.rerunReason }),
    createdAt: now,
    updatedAt: now,
  };

  ScanExecutionSchema.parse(record);
  return record;
}
