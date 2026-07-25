import 'server-only';
import type { Business } from '@/domain/models/business';
import type { ScanFailureCategory } from '@/domain/models/scan-event';
import type { QualificationResult } from '@/domain/models/website-assessment';

/**
 * Deterministic overrides applied on top of the AI's own qualification
 * recommendation — see implementation.md, Stage 15, "Qualification rules".
 * A pure function, unit-testable independent of the scoring pipeline.
 *
 * Only the two overrides below are implemented — "closed business",
 * "national chain", and "government organization" from the Stage 15 spec
 * are deliberately NOT enforced here yet: no field on `Business` persists
 * any of those signals today. Google Places' `businessStatus` is fetched
 * live during discovery but explicitly never persisted (see Stage 12,
 * "review context only — never persisted"), and there is no chain/
 * government classification anywhere in the domain model. Until one of
 * those signals is actually captured, the AI's own qualification is used
 * for those cases — it can still down-rank or explain a closed/chain/
 * government business in `assessment.weaknesses`/`executiveSummary`, just
 * without a code-enforced override. "Invalid address" is similarly
 * unenforced — `Business.address` has no validity flag today.
 */

const WEBSITE_UNAVAILABLE_CATEGORIES: ReadonlySet<ScanFailureCategory> = new Set([
  'website_unreachable',
  'website_error_response',
  'blocked_url',
  'invalid_url',
]);

export interface ApplyQualificationOverridesInput {
  business: Business;
  aiQualification: QualificationResult;
  /** The failure category of the business's most recent Firecrawl scan, if it failed. */
  firecrawlFailureCategory?: ScanFailureCategory;
}

export function applyQualificationOverrides({
  business,
  aiQualification,
  firecrawlFailureCategory,
}: ApplyQualificationOverridesInput): QualificationResult {
  if (!business.websiteUrl?.trim()) return 'qualified';
  if (firecrawlFailureCategory && WEBSITE_UNAVAILABLE_CATEGORIES.has(firecrawlFailureCategory)) {
    return 'manual_review';
  }
  return aiQualification;
}
