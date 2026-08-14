import 'server-only';
import { listAllScans } from '@/lib/db/scan-events';
import { listAllScanExecutions } from '@/lib/db/scan-executions';
import { listAllPostcards } from '@/lib/db/postcards';
import { listAllBusinesses } from '@/lib/db/businesses';
import { getScanTypeLabel } from '@/lib/scans/scan-type';

/**
 * Stage 24 — the bounded "Recent Operations" feed. Reuses the same
 * already-established bounded-`Scan` list functions the aggregation module
 * uses — no new cross-table analytics, no new GSI, no expensive scan. Per
 * implementation.md, Stage 24: "if obtaining a specific category
 * efficiently is not possible with the current data model, omit it rather
 * than introducing a bad table scan or unnecessary GSI." Lead-delivery
 * events are deliberately omitted from this feed for exactly that reason —
 * `lib/db/leads.ts` has no "recently sent" query, only per-business and
 * needs-retry queries, and adding one would mean a new GSI for a
 * nice-to-have feed item.
 */

export interface RecentOperationItem {
  id: string;
  label: string;
  businessName?: string;
  occurredAt: string;
}

const RECENT_OPERATIONS_LIMIT = 15;

export async function listRecentOperations(): Promise<RecentOperationItem[]> {
  const [businesses, scans, scanExecutions, postcards] = await Promise.all([
    listAllBusinesses(),
    listAllScans(),
    listAllScanExecutions(),
    listAllPostcards(),
  ]);

  const businessNames = new Map(businesses.map((b) => [b.businessId, b.name]));
  const items: RecentOperationItem[] = [];

  for (const scan of scans) {
    if (scan.status !== 'completed' && scan.status !== 'partial') continue;
    items.push({
      id: `scan:${scan.scanId}`,
      label: `${getScanTypeLabel(scan)} completed`,
      businessName: businessNames.get(scan.businessId),
      occurredAt: scan.completedAt ?? scan.updatedAt,
    });
  }

  for (const execution of scanExecutions) {
    if (execution.status !== 'preview_ready' && execution.status !== 'qualified') continue;
    items.push({
      id: `scanexec:${execution.scanExecutionId}`,
      label: 'Full scan completed',
      businessName: businessNames.get(execution.businessId),
      occurredAt: execution.completedAt ?? execution.updatedAt,
    });
  }

  for (const postcard of postcards) {
    if (postcard.status !== 'submitted' && postcard.status !== 'mailed' && postcard.status !== 'delivered') continue;
    items.push({
      id: `postcard:${postcard.postcardId}`,
      label: 'Postcard submitted',
      businessName: businessNames.get(postcard.businessId),
      occurredAt: postcard.submittedAt ?? postcard.updatedAt,
    });
  }

  items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return items.slice(0, RECENT_OPERATIONS_LIMIT);
}
