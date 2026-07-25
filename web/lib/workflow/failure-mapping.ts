import type { ScanFailureCategory } from '@/domain/models/scan-event';
import type { ScanWorkflowFailureCategory } from '@/domain/models/scan-execution';

/**
 * Rolls up the 23-value, provider-specific `ScanFailureCategory` (the source
 * of truth for what actually went wrong, recorded on the underlying
 * `ScanEvent`) into the coarser `ScanWorkflowFailureCategory` used to drive
 * Step Functions retry/catch branching. See implementation.md, Stage 16,
 * "ScanExecution additions" — this is a mapping, not a second independent
 * taxonomy.
 *
 * `'not_found'` and `'conditional_conflict'` have no entry here — they arise
 * directly from workflow-level conditions (a missing Business record, a lost
 * `queued → running` claim) rather than from an underlying ScanEvent, so
 * workflow code sets them directly instead of mapping through this table.
 */
const FAILURE_CATEGORY_MAP: Record<ScanFailureCategory, ScanWorkflowFailureCategory> = {
  missing_website: 'validation',
  invalid_url: 'validation',
  blocked_url: 'validation',
  firecrawl_auth: 'internal',
  firecrawl_rate_limit: 'rate_limit',
  firecrawl_timeout: 'provider_timeout',
  firecrawl_provider_error: 'provider_error',
  website_unreachable: 'network',
  website_error_response: 'validation',
  empty_content: 'validation',
  normalization_failed: 'internal',
  artifact_storage_failed: 'artifact_persistence',
  generation_failed: 'provider_error',
  preview_persistence_failed: 'artifact_persistence',
  browser_launch_failed: 'internal',
  navigation_timeout: 'provider_timeout',
  page_load_failed: 'network',
  blocked_by_bot_protection: 'validation',
  screenshot_failed: 'provider_error',
  upload_failed: 'artifact_persistence',
  invalid_ai_schema_output: 'schema_validation',
  ai_request_failed: 'provider_error',
  ai_timeout: 'provider_timeout',
  unknown: 'internal',
};

export function mapToWorkflowFailureCategory(category: ScanFailureCategory): ScanWorkflowFailureCategory {
  return FAILURE_CATEGORY_MAP[category];
}

/**
 * Which workflow failure categories are eligible for Step Functions' own
 * retry policy — transient provider/network conditions only, mirroring
 * `lib/firecrawl/retry.ts`'s `isRetryableFailureCategory` but at the
 * workflow-wide (all-provider) level instead of Firecrawl-only.
 */
const WORKFLOW_RETRYABLE_CATEGORIES: ReadonlySet<ScanWorkflowFailureCategory> = new Set([
  'rate_limit',
  'provider_timeout',
  'provider_error',
  'network',
]);

export function isWorkflowFailureRetryable(category: ScanWorkflowFailureCategory): boolean {
  return WORKFLOW_RETRYABLE_CATEGORIES.has(category);
}
