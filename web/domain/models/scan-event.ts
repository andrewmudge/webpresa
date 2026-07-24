import type { MutableTimestampedRecord } from './common';
import type { ScanImageAsset } from './scan-image';
import type { WebsiteAssessment, WebsiteDeterministicMetrics } from './website-assessment';

// ---------------------------------------------------------------------------
// Status, provider, operation, and failure-category enums
//
// ScanEvent had no real caller before Stage 13 (Firecrawl Website
// Enrichment) — Stage 12 (Google Places) explicitly creates no ScanEvent
// records, see architecture.md, "Google Places Discovery Boundary". This is
// the first stage to actually write one, so the shape below is designed
// directly for Stage 13's execution model rather than defensively extending
// an in-use shape.
// ---------------------------------------------------------------------------

export const SCAN_STATUSES = [
  'queued',
  'running',
  'completed',
  'partial',
  'failed',
  'manual_approval_required',
] as const;
export type ScanStatus = (typeof SCAN_STATUSES)[number];

// 'playwright' (Stage 14 — screenshot capture) and 'openai' (Stage 15 — AI
// scoring) added alongside 'firecrawl'.
export const SCAN_PROVIDERS = ['firecrawl', 'playwright', 'openai'] as const;
export type ScanProvider = (typeof SCAN_PROVIDERS)[number];

// 'screenshot' (Stage 14) and 'score' (Stage 15) added alongside 'scrape'.
export const SCAN_OPERATIONS = ['scrape', 'screenshot', 'score'] as const;
export type ScanOperation = (typeof SCAN_OPERATIONS)[number];

/**
 * Why a scan attempt did not complete successfully. Drives both admin-facing
 * copy and automatic-retry eligibility — see
 * `lib/firecrawl/retry.ts`'s `isRetryableFailureCategory`. The six
 * `browser_launch_failed`…`upload_failed` categories are Stage 14
 * (Playwright) specific; the three `invalid_ai_schema_output`…`ai_timeout`
 * categories are Stage 15 (AI scoring) specific; everything above them is
 * Stage 13 (Firecrawl).
 */
export const SCAN_FAILURE_CATEGORIES = [
  'missing_website',
  'invalid_url',
  'blocked_url',
  'firecrawl_auth',
  'firecrawl_rate_limit',
  'firecrawl_timeout',
  'firecrawl_provider_error',
  'website_unreachable',
  'empty_content',
  'normalization_failed',
  'artifact_storage_failed',
  'generation_failed',
  'preview_persistence_failed',
  'browser_launch_failed',
  'navigation_timeout',
  'page_load_failed',
  'blocked_by_bot_protection',
  'screenshot_failed',
  'upload_failed',
  'invalid_ai_schema_output',
  'ai_request_failed',
  'ai_timeout',
  'unknown',
] as const;
export type ScanFailureCategory = (typeof SCAN_FAILURE_CATEGORIES)[number];

/**
 * Stage 14 (Playwright) capture target — which URL a screenshot ScanEvent
 * points at. See implementation.md, Stage 14, "Screenshot targets".
 */
export const SCAN_TARGET_TYPES = ['existing_site', 'generated_preview'] as const;
export type ScanTargetType = (typeof SCAN_TARGET_TYPES)[number];

// ---------------------------------------------------------------------------
// Sub-types
// ---------------------------------------------------------------------------

/**
 * Quality scores produced by a scan run, each on a 0–100 scale. An early,
 * generic placeholder reserved ahead of Stage 15 — superseded by the much
 * richer `WebsiteAssessment` shape (`ScanEvent.assessment` below), which
 * Stage 15 actually writes. Left in place, unused, for backward
 * compatibility with the reservation, mirroring how `ScanStorageKeys` was
 * superseded by `captureResults` ahead of Stage 14.
 */
export interface ScanScores {
  overall?: number;
  design?: number;
  mobile?: number;
  seo?: number;
  performance?: number;
  accessibility?: number;
}

/**
 * Object-storage keys — an early, generic placeholder reserved ahead of
 * Stage 14. Superseded by the more specific `captureResults` below, which
 * records each viewport's own outcome (not just its storage key) and is
 * what Stage 14 Playwright scans actually populate. Left in place, unused,
 * for backward compatibility with the reservation — no code path sets it.
 */
export interface ScanStorageKeys {
  screenshotKey?: string;
  htmlSnapshotKey?: string;
  lighthouseKey?: string;
}

/**
 * One viewport's own capture outcome within a Stage 14 (Playwright)
 * ScanEvent. A single scan-level `failureCategory` can't say *which*
 * viewport failed on a `'partial'` result — this can.
 */
export interface ViewportCaptureResult {
  status: 'completed' | 'failed';
  /** S3 key, e.g. `scans/{businessId}/{scanId}/existing/desktop.png`. Set only when status is 'completed'. */
  storageKey?: string;
  failureCategory?: ScanFailureCategory;
  failureMessage?: string;
}

/**
 * Per-viewport results for a Stage 14 (Playwright) screenshot ScanEvent.
 * Top-level `ScanEvent.status`/`failureCategory`/`failureMessage` remain the
 * whole-scan summary; this is the diagnosable detail behind a `'partial'`
 * result. Firecrawl ScanEvents never set this field.
 */
export interface ScanCaptureResults {
  desktop?: ViewportCaptureResult;
  mobile?: ViewportCaptureResult;
}

// ---------------------------------------------------------------------------
// ScanEvent record
// ---------------------------------------------------------------------------

/**
 * A single provider attempt — a Firecrawl scrape (Stage 13) or a Playwright
 * screenshot capture (Stage 14) — run against a business's website or one of
 * its own generated previews.
 *
 * Lifecycle: `queued` → `running` → `completed` | `partial` | `failed` |
 * `manual_approval_required` (`manual_approval_required` only for
 * Firecrawl's no-website path, which never calls the provider at all;
 * `partial` only for Playwright, when one of its two viewports succeeds and
 * the other fails — see `captureResults`). A terminal ScanEvent is an
 * immutable historical record — it is never transitioned back to `running`;
 * a retry always creates a brand-new ScanEvent linked via `retryOfScanId`.
 * Every status transition is a conditional DynamoDB update guarding against
 * Lambda's at-least-once delivery — see implementation.md, Stage 14,
 * "Idempotency and status transitions".
 */
export interface ScanEvent extends MutableTimestampedRecord {
  /** Globally unique identifier.  Format: `scan_<uuid>` */
  scanId: string;
  businessId: string;
  provider: ScanProvider;
  operation: ScanOperation;
  status: ScanStatus;
  /** The URL that was (or would have been) scanned. Absent for the no-website path. */
  sourceUrl?: string;
  /** The provider's final URL after redirects, once known. */
  finalUrl?: string;
  httpStatus?: number;
  failureCategory?: ScanFailureCategory;
  /** Safe, admin-facing failure summary — never a raw provider error or stack trace. */
  failureMessage?: string;
  /** 1 for a first attempt; incremented on each retry. */
  attempt: number;
  /** Set only on a retry — points at the ScanEvent this attempt retries. */
  retryOfScanId?: string;
  /** S3 key for the sanitized raw Firecrawl response — `scans/{businessId}/{scanId}/crawl.json`. */
  rawArtifactKey?: string;
  /** S3 key for the validated WebsiteEnrichmentSnapshot — `scans/{businessId}/{scanId}/extracted.json`. */
  extractedArtifactKey?: string;
  /** Images discovered and (if accepted/review_required) rehosted during this scan. */
  images?: ScanImageAsset[];
  /** Set once generation succeeds and a new SitePreview is persisted. */
  generatedPreviewId?: string;
  storageKeys?: ScanStorageKeys;
  /**
   * Stage 14 (Playwright) only — which URL this scan captures. Absent for
   * Firecrawl scans.
   */
  targetType?: ScanTargetType;
  /**
   * Stage 14 (Playwright) only — the SitePreview being captured, set only
   * when `targetType` is `'generated_preview'`. Distinct from
   * `generatedPreviewId` above (a preview a Firecrawl scan *produced*) —
   * this is an input reference, not an output.
   */
  previewId?: string;
  /** Stage 14 (Playwright) only — per-viewport capture outcome. */
  captureResults?: ScanCaptureResults;
  scores?: ScanScores;
  /** Stage 15 (AI scoring) only — deterministic, non-AI grounding metrics fed into the prompt. */
  deterministicMetrics?: WebsiteDeterministicMetrics;
  /** Stage 15 (AI scoring) only — the validated AI assessment. Absent when scoring used the no-website shortcut (see `lib/scoring/score-business.ts`). */
  assessment?: WebsiteAssessment;
  /** Stage 15 (AI scoring) only — S3 key for the raw, unvalidated OpenAI response — `scans/{businessId}/{scanId}/ai-response.json`. Never read back into the app; preserved for audit only. */
  aiResponseArtifactKey?: string;
  /** Stage 15 (AI scoring) only — model/prompt metadata for the attempt that produced `assessment`. No `temperature` — the scoring model is reasoning-class and only supports its default value. */
  aiMetadata?: { model: string; promptVersion: string };
  /** ISO 8601 timestamp — set when the scan transitions to `running`. */
  startedAt?: string;
  /** ISO 8601 timestamp — set when the scan reaches a terminal status. */
  completedAt?: string;
}
