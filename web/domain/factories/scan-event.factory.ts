import type { ScanEvent, ScanProvider, ScanOperation } from '@/domain/models/scan-event';
import { ScanEventSchema } from '@/domain/schemas/scan-event.schema';
import { generateId, nowIso } from './utils';

export interface CreateScanEventInput {
  businessId: string;
  provider: ScanProvider;
  operation: ScanOperation;
  /** Absent for the no-website manual-approval path. */
  sourceUrl?: string;
  /** Defaults to 1 for a first attempt. */
  attempt?: number;
  /** Set only when this ScanEvent is a retry of a prior failed attempt. */
  retryOfScanId?: string;
}

/**
 * Create a new ScanEvent record in `'queued'` status.
 *
 * The caller transitions `status` to `'running'` (setting `startedAt`) once
 * processing actually begins, and to a terminal status (`'completed'`,
 * `'failed'`, or `'manual_approval_required'`) when the attempt concludes.
 * A retry never mutates a prior ScanEvent — it always creates a new one via
 * this factory with `retryOfScanId` set and `attempt` incremented.
 */
export function createScanEvent(input: CreateScanEventInput): ScanEvent {
  const now = nowIso();

  const record: ScanEvent = {
    scanId: generateId('scan_'),
    businessId: input.businessId,
    provider: input.provider,
    operation: input.operation,
    status: 'queued',
    ...(input.sourceUrl !== undefined && { sourceUrl: input.sourceUrl }),
    attempt: input.attempt ?? 1,
    ...(input.retryOfScanId !== undefined && { retryOfScanId: input.retryOfScanId }),
    createdAt: now,
    updatedAt: now,
  };

  ScanEventSchema.parse(record);
  return record;
}
