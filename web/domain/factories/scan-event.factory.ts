import type { ScanEvent } from '@/domain/models/scan-event';
import { ScanEventSchema } from '@/domain/schemas/scan-event.schema';
import { generateId, nowIso } from './utils';

export interface CreateScanEventInput {
  businessId: string;
  sourceUrl: string;
}

/**
 * Create a new ScanEvent record in `'pending'` status.
 *
 * `startedAt` is set to the current time at creation.  The processing
 * layer must update `status`, `completedAt`, and optionally `scores` or
 * `failureReason` when the scan concludes.
 */
export function createScanEvent(input: CreateScanEventInput): ScanEvent {
  const now = nowIso();

  const record: ScanEvent = {
    scanId: generateId('scan_'),
    businessId: input.businessId,
    status: 'pending',
    sourceUrl: input.sourceUrl,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  ScanEventSchema.parse(record);
  return record;
}
