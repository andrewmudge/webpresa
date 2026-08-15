/**
 * Client-safe types and constants for the Stage 24 "Needs Attention"
 * aggregation — split out from `needs-attention.ts` because that module
 * imports `server-only` (transitively, via the repository functions it
 * calls) and cannot be imported, even for types/constants, from a
 * `'use client'` component like `NeedsAttentionSection.tsx` without
 * pulling the entire server-only DB module graph into the client bundle
 * (a real Next.js build failure, not just a lint concern — confirmed the
 * hard way). No import here depends on `server-only`.
 */

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
