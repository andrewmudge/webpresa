import 'server-only';
import { listAllScans } from '@/lib/db/scan-events';
import { listAllScanExecutions } from '@/lib/db/scan-executions';
import { listAllPostcards } from '@/lib/db/postcards';
import { listLeadsNeedingNotificationRetry } from '@/lib/db/leads';
import { listRecentStripeWebhookFailures } from '@/lib/db/stripe-webhook-failures';
import { listDismissedItemIds } from '@/lib/db/operations-dismissals';
import { listAllBusinesses } from '@/lib/db/businesses';
import { isStaleScan } from '@/lib/screenshots/capture';
import { isStaleExecution } from '@/lib/workflow/stale';
import { isRetryableFailureCategory } from '@/lib/firecrawl/retry';
import { derivePostcardStatus } from '@/lib/postcards/status';
import { getScreenshotDlqDepth } from '@/lib/sqs/dlq';
import { getScanTypeLabel } from '@/lib/scans/scan-type';
import type { ScanFailureCategory } from '@/domain/models/scan-event';

/**
 * Stage 24 — the "Needs Attention" aggregation for `/admin/operations`.
 * Every list call below is the same bounded-`Scan`-with-safety-cap pattern
 * already established by `listAllScans()`/`listAllPostcards()`/
 * `listLeadsNeedingNotificationRetry()` — deliberately NOT the `status-index`
 * GSIs that exist on several tables, which are unused by any application
 * code today and are explicitly flagged in `infra/lib/stacks/data-stack.ts`
 * as a pre-production hot-partition anti-pattern. This aggregation follows
 * the codebase's own established alternative rather than activating that
 * flagged pattern.
 *
 * `manual_approval_required` ScanEvents (e.g. every business with no
 * website on file) are deliberately excluded — that's an expected, frequent
 * disposition surfaced during normal business editing, not a failure, and
 * including it here would immediately flood the page with noise the whole
 * point of this stage is to avoid.
 */

/** Matches app/api/internal/leads/retry-notifications/route.ts's own constant. */
const MAX_LEAD_NOTIFICATION_ATTEMPTS = 5;

/** Scan failure categories that indicate a credential/configuration problem rather than a per-prospect issue — see implementation.md, Stage 24, "provider/authentication failures". */
const AUTH_OR_CONFIG_FAILURE_CATEGORIES: ReadonlySet<ScanFailureCategory> = new Set(['firecrawl_auth']);

export type OperationsRecommendedAction =
  | 'safe_retry'
  | 'requires_configuration_fix'
  | 'requires_manual_review'
  | 'investigate';

export const RECOMMENDED_ACTION_LABELS: Record<OperationsRecommendedAction, string> = {
  safe_retry: 'Safe to retry',
  requires_configuration_fix: 'Requires configuration fix',
  requires_manual_review: 'Requires manual review',
  investigate: 'Unknown — investigate',
};

export type NeedsAttentionRecovery =
  | { kind: 'retry_enrichment'; businessId: string; scanId: string }
  | { kind: 'mark_stale_scan_failed'; businessId: string; scanId: string }
  | { kind: 'mark_stale_execution_failed'; businessId: string; scanExecutionId: string }
  | { kind: 'rerun_scan_workflow'; businessId: string; scanExecutionId: string }
  | { kind: 'retry_render_postcard'; postcardId: string }
  | { kind: 'retry_lead_notification'; businessId: string; leadId: string };

export interface NeedsAttentionItem {
  id: string;
  category: 'scan' | 'scan_execution' | 'postcard' | 'lead_notification' | 'stripe_webhook' | 'dlq';
  title: string;
  /** Safe, admin-facing summary — never a raw provider error or stack trace (see the underlying record's own doc comments). */
  detail?: string;
  businessId?: string;
  businessName?: string;
  occurredAt: string;
  recommendedAction: OperationsRecommendedAction;
  recovery?: NeedsAttentionRecovery;
  provider?: string;
  operation?: string;
  errorCategory?: string;
  retryable?: boolean;
  attempt?: number;
  scanId?: string;
  scanExecutionId?: string;
  postcardId?: string;
  leadId?: string;
}

export interface NeedsAttentionResult {
  items: NeedsAttentionItem[];
  screenshotDlqDepth: number | null;
}

function looksLikeAuthFailure(message: string): boolean {
  return /auth|unauthorized|forbidden|invalid.{0,10}key|credential/i.test(message);
}

export async function aggregateNeedsAttention(): Promise<NeedsAttentionResult> {
  const [businesses, scans, scanExecutions, postcards, failedLeadCandidates, stripeFailures, dlqDepth, dismissedIds] = await Promise.all([
    listAllBusinesses(),
    listAllScans(),
    listAllScanExecutions(),
    listAllPostcards(),
    listLeadsNeedingNotificationRetry(MAX_LEAD_NOTIFICATION_ATTEMPTS),
    listRecentStripeWebhookFailures(),
    getScreenshotDlqDepth(),
    listDismissedItemIds(),
  ]);

  const businessNames = new Map(businesses.map((b) => [b.businessId, b.name]));
  const items: NeedsAttentionItem[] = [];

  for (const scan of scans) {
    const stale = isStaleScan(scan);
    if (scan.status !== 'failed' && !stale) continue;

    const category = scan.failureCategory;
    const retryable = category ? isRetryableFailureCategory(category) : false;
    const isAuthOrConfig = category ? AUTH_OR_CONFIG_FAILURE_CATEGORIES.has(category) : false;

    let recommendedAction: OperationsRecommendedAction;
    let recovery: NeedsAttentionRecovery | undefined;

    if (stale) {
      recommendedAction = 'safe_retry';
      recovery = { kind: 'mark_stale_scan_failed', businessId: scan.businessId, scanId: scan.scanId };
    } else if (isAuthOrConfig) {
      recommendedAction = 'requires_configuration_fix';
    } else if (scan.provider === 'firecrawl' && retryable) {
      recommendedAction = 'safe_retry';
      recovery = { kind: 'retry_enrichment', businessId: scan.businessId, scanId: scan.scanId };
    } else {
      recommendedAction = 'requires_manual_review';
    }

    items.push({
      id: `scan:${scan.scanId}`,
      category: 'scan',
      title: stale ? `${getScanTypeLabel(scan)} appears stuck` : `${getScanTypeLabel(scan)} failed`,
      detail: scan.failureMessage,
      businessId: scan.businessId,
      businessName: businessNames.get(scan.businessId),
      occurredAt: scan.completedAt ?? scan.updatedAt,
      recommendedAction,
      recovery,
      provider: scan.provider,
      operation: scan.operation,
      errorCategory: category,
      retryable,
      attempt: scan.attempt,
      scanId: scan.scanId,
    });
  }

  for (const execution of scanExecutions) {
    const stale = isStaleExecution(execution);
    if (execution.status !== 'failed' && !stale) continue;

    const retryable = execution.failure ? execution.failure.retryEligible : false;

    let recommendedAction: OperationsRecommendedAction;
    let recovery: NeedsAttentionRecovery | undefined;

    if (stale) {
      recommendedAction = 'safe_retry';
      recovery = { kind: 'mark_stale_execution_failed', businessId: execution.businessId, scanExecutionId: execution.scanExecutionId };
    } else if (retryable) {
      recommendedAction = 'safe_retry';
      recovery = { kind: 'rerun_scan_workflow', businessId: execution.businessId, scanExecutionId: execution.scanExecutionId };
    } else {
      recommendedAction = 'requires_manual_review';
    }

    items.push({
      id: `scanexec:${execution.scanExecutionId}`,
      category: 'scan_execution',
      title: stale ? 'Scan workflow appears stuck' : 'Scan workflow failed',
      detail: execution.failure?.safeMessage,
      businessId: execution.businessId,
      businessName: businessNames.get(execution.businessId),
      occurredAt: execution.completedAt ?? execution.updatedAt,
      recommendedAction,
      recovery,
      provider: execution.failure?.provider ?? 'internal',
      operation: execution.currentStep,
      errorCategory: execution.failure?.category,
      retryable,
      attempt: execution.attemptNumber,
      scanExecutionId: execution.scanExecutionId,
    });
  }

  for (const postcard of postcards) {
    const status = derivePostcardStatus(postcard);
    if (status !== 'render_failed' && postcard.status !== 'failed') continue;

    if (status === 'render_failed') {
      items.push({
        id: `postcard:${postcard.postcardId}:render`,
        category: 'postcard',
        title: 'Postcard rendering failed',
        businessId: postcard.businessId,
        businessName: businessNames.get(postcard.businessId),
        occurredAt: postcard.updatedAt,
        recommendedAction: 'safe_retry',
        recovery: { kind: 'retry_render_postcard', postcardId: postcard.postcardId },
        provider: 'internal',
        operation: 'render',
        postcardId: postcard.postcardId,
      });
    } else {
      // postcard.status === 'failed' — a Lob submission (or webhook-reported)
      // failure. No retry button: SubmitButton.tsx already states plainly
      // that a new postcard must be generated to retry a failed submission —
      // there is no safe retry path for this stage's scope (see
      // implementation.md, Stage 24, "Architecture corrections").
      const message = postcard.failureReason ?? '';
      items.push({
        id: `postcard:${postcard.postcardId}:submission`,
        category: 'postcard',
        title: 'Postcard submission failed',
        detail: postcard.failureReason,
        businessId: postcard.businessId,
        businessName: businessNames.get(postcard.businessId),
        occurredAt: postcard.updatedAt,
        recommendedAction: looksLikeAuthFailure(message) ? 'requires_configuration_fix' : 'requires_manual_review',
        provider: postcard.provider,
        operation: 'submit',
        postcardId: postcard.postcardId,
      });
    }
  }

  for (const lead of failedLeadCandidates) {
    if (lead.notificationStatus !== 'failed') continue;
    items.push({
      id: `lead:${lead.leadId}`,
      category: 'lead_notification',
      title: 'Lead notification email failed to send',
      detail: lead.lastNotificationError,
      businessId: lead.businessId,
      businessName: businessNames.get(lead.businessId),
      occurredAt: lead.lastNotificationAttemptAt ?? lead.updatedAt,
      recommendedAction: 'safe_retry',
      recovery: { kind: 'retry_lead_notification', businessId: lead.businessId, leadId: lead.leadId },
      provider: 'ses',
      errorCategory: lead.lastNotificationError,
      attempt: lead.notificationAttempts,
      leadId: lead.leadId,
    });
  }

  for (const failure of stripeFailures) {
    items.push({
      id: `stripe:${failure.id}`,
      category: 'stripe_webhook',
      title: failure.errorCategory === 'invalid_signature' ? 'Stripe webhook signature verification failed' : 'Stripe webhook processing failed',
      detail: failure.errorMessage,
      businessId: failure.businessId,
      businessName: failure.businessId ? businessNames.get(failure.businessId) : undefined,
      occurredAt: failure.createdAt,
      recommendedAction: failure.errorCategory === 'invalid_signature' ? 'requires_configuration_fix' : 'investigate',
      provider: 'stripe',
      operation: failure.eventType,
      errorCategory: failure.errorCategory,
    });
  }

  if (dlqDepth !== null && dlqDepth.approximateMessageCount > 0) {
    items.push({
      id: 'dlq:screenshot',
      category: 'dlq',
      title: `${dlqDepth.approximateMessageCount} screenshot capture${dlqDepth.approximateMessageCount === 1 ? '' : 's'} failed to invoke`,
      detail: 'The screenshot Lambda dead-letter queue has messages — one or more captures failed at the platform level without ever running.',
      occurredAt: new Date().toISOString(),
      recommendedAction: 'investigate',
      provider: 'playwright',
    });
  }

  // Dismissed items (see lib/db/operations-dismissals.ts) are a snooze, not
  // a delete — nothing above is skipped or mutated because of a dismissal;
  // this is purely a display-layer filter applied last, so a dismissed
  // item's underlying record is always still fully aggregated and would
  // reappear the moment its dismissal expires (~30 days) or is cleared.
  const visibleItems = items.filter((item) => !dismissedIds.has(item.id));

  visibleItems.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return { items: visibleItems, screenshotDlqDepth: dlqDepth?.approximateMessageCount ?? null };
}
