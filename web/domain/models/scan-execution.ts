import type { MutableTimestampedRecord } from './common';
import type { QualificationResult, LeadPriority } from './website-assessment';

// ---------------------------------------------------------------------------
// Stage 16 — Step Functions Scan and Preview Workflow
//
// `ScanEvent` is a per-operation record (one Firecrawl scrape, one Playwright
// capture, one AI score) — a single Stage 16 run spans several of them. This
// is the workflow-execution record instead: one per Step Functions run,
// referencing the several `ScanEvent`s (and the `SitePreview`) it produces
// rather than replacing them. See implementation.md, Stage 16, "Workflow
// ownership".
// ---------------------------------------------------------------------------

export const SCAN_WORKFLOW_STATUSES = [
  'queued',
  'running',
  'manual_review',
  'qualified',
  'reject',
  'preview_ready',
  'failed',
] as const;
export type ScanWorkflowStatus = (typeof SCAN_WORKFLOW_STATUSES)[number];

export const SCAN_WORKFLOW_STEPS = [
  'initializing',
  'loading_business',
  'validating',
  'recording_no_website',
  'crawling',
  'capturing_source_screenshots',
  'scoring',
  'qualifying',
  'generating_preview',
  'capturing_preview_screenshots',
  'queueing_manual_review',
  'finalizing',
] as const;
export type ScanWorkflowStep = (typeof SCAN_WORKFLOW_STEPS)[number];

/**
 * Coarse, workflow-level rollup — mapped from the underlying `ScanEvent`'s
 * 23-value `ScanFailureCategory` (see `lib/workflow/failure-mapping.ts`), not
 * an independent taxonomy. `ScanFailureCategory` stays the source of truth
 * for what actually went wrong; this is just enough detail to drive
 * Step Functions retry/catch branching.
 */
export const SCAN_WORKFLOW_FAILURE_CATEGORIES = [
  'validation',
  'not_found',
  'rate_limit',
  'provider_timeout',
  'provider_error',
  'network',
  'schema_validation',
  'artifact_persistence',
  'conditional_conflict',
  'internal',
] as const;
export type ScanWorkflowFailureCategory = (typeof SCAN_WORKFLOW_FAILURE_CATEGORIES)[number];

export const SCAN_WORKFLOW_PROVIDERS = ['firecrawl', 'playwright', 'openai', 'internal'] as const;
export type ScanWorkflowProvider = (typeof SCAN_WORKFLOW_PROVIDERS)[number];

export const SCAN_WORKFLOW_TRIGGER_SOURCES = ['admin_manual'] as const;
export type ScanWorkflowTriggerSource = (typeof SCAN_WORKFLOW_TRIGGER_SOURCES)[number];

export interface ScanWorkflowFailure {
  step: ScanWorkflowStep;
  category: ScanWorkflowFailureCategory;
  /** Safe, admin-facing summary — never a raw provider error or stack trace. */
  safeMessage: string;
  provider?: ScanWorkflowProvider;
  occurredAt: string;
  attemptCount: number;
  retryEligible: boolean;
}

/**
 * One Step Functions execution for one business. Created `queued` by the
 * admin trigger before the state machine starts; the workflow's first state
 * claims it `queued → running` via a conditional update (see
 * `lib/db/scan-executions.ts`'s `claimScanExecutionStatus`), guarding against
 * a duplicate concurrent trigger exactly like `ScanEvent`'s own
 * `queued → running` transitions.
 *
 * Terminal statuses (`manual_review`, `qualified`, `reject`, `preview_ready`,
 * `failed`) are immutable historical records — a rerun always creates a new
 * `ScanExecution` linked via `parentScanExecutionId`, never resets a
 * completed one back to `queued`.
 */
export interface ScanExecution extends MutableTimestampedRecord {
  /** Globally unique identifier. Format: `scanexec_<uuid>` */
  scanExecutionId: string;
  businessId: string;
  executionArn?: string;
  executionName?: string;
  status: ScanWorkflowStatus;
  currentStep?: ScanWorkflowStep;
  triggerSource: ScanWorkflowTriggerSource;
  /** Admin username — see `lib/auth/session.ts`'s `SessionPayload.sub`. */
  requestedBy: string;

  // References to the per-operation ScanEvents/SitePreview this execution
  // produced — never a copy of their content. See "Workflow ownership" above.
  crawlScanId?: string;
  sourceScreenshotScanId?: string;
  scoreScanId?: string;
  previewScreenshotScanId?: string;
  previewId?: string;

  /** Mirrors `Business.qualification` at the time this execution completed — see implementation.md, Stage 16, "Business record updates". */
  qualification?: QualificationResult;
  leadPriority?: LeadPriority;
  manualReviewReason?: string;

  /** 1 for a first run; incremented on each rerun. */
  attemptNumber: number;
  /** Set only on a rerun — points at the ScanExecution this run reruns. */
  parentScanExecutionId?: string;
  rerunReason?: string;
  failure?: ScanWorkflowFailure;

  /** ISO 8601 timestamp — set when the execution transitions to `running`. */
  startedAt?: string;
  /** ISO 8601 timestamp — set when the execution reaches a terminal status. */
  completedAt?: string;
}
