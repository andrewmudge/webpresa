/**
 * Minimal local mirrors of the fields this Lambda actually reads/writes on
 * the shared `Business`/`SitePreview`/`ScanEvent` domain records.
 *
 * This package cannot import `web/domain/models/*` directly — this repo has
 * no npm workspace tooling (`web/`, `infra/`, and this Lambda are three
 * fully independent npm projects; see `web/lib/security/url-validation.ts`'s
 * own doc comment for the identical constraint on the SSRF guard). Keeping
 * these shapes narrow and hand-mirrored, rather than duplicating the full
 * domain models, is deliberate: it's obvious at a glance exactly which
 * fields this Lambda depends on, and a change to an unrelated field on the
 * real model can never silently desync this file.
 */

export type ScanTargetType = 'existing_site' | 'generated_preview';
export type ScanStatus = 'queued' | 'running' | 'completed' | 'partial' | 'failed' | 'manual_approval_required';

export type ScanFailureCategory =
  | 'browser_launch_failed'
  | 'navigation_timeout'
  | 'page_load_failed'
  | 'blocked_by_bot_protection'
  | 'screenshot_failed'
  | 'upload_failed'
  | 'invalid_url'
  | 'blocked_url'
  | 'unknown';

export interface ViewportCaptureResult {
  status: 'completed' | 'failed';
  storageKey?: string;
  failureCategory?: ScanFailureCategory;
  failureMessage?: string;
}

export interface ScanCaptureResults {
  desktop?: ViewportCaptureResult;
  mobile?: ViewportCaptureResult;
}

export interface ScanEventRecord {
  scanId: string;
  businessId: string;
  provider: string;
  operation: string;
  status: ScanStatus;
  targetType?: ScanTargetType;
  previewId?: string;
  captureResults?: ScanCaptureResults;
  failureCategory?: ScanFailureCategory;
  failureMessage?: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface BusinessRecord {
  businessId: string;
  websiteUrl?: string;
  [key: string]: unknown;
}

export interface SitePreviewRecord {
  previewId: string;
  slug: string;
  [key: string]: unknown;
}

/** The identifiers-only Lambda invocation payload — see implementation.md, Stage 14, "Lambda payload". */
export interface CapturePayload {
  businessId: string;
  scanId: string;
  targetType: ScanTargetType;
  previewId?: string;
}
