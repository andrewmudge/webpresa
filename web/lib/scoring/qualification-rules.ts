import 'server-only';
import type { Business } from '@/domain/models/business';
import type { ScanFailureCategory } from '@/domain/models/scan-event';
import type { QualificationResult, LeadPriority } from '@/domain/models/website-assessment';

/**
 * Deterministic overrides applied on top of the AI's own qualification
 * recommendation — see implementation.md, Stage 15, "Qualification rules".
 * A pure function, unit-testable independent of the scoring pipeline.
 *
 * `overallScore`/`confidence`/`leadPriority`/`qualification` are four
 * independent, sibling fields the AI returns in one structured-output call
 * (`lib/ai/score-website.ts`) — nothing in the prompt ties `qualification`
 * to score, so it's trusted entirely to an under-specified model judgment
 * call unless overridden here. The high-quality-existing-site rule below
 * exists because that gap let a business with an 89/100 existing site get
 * auto-qualified — plainly wrong for a campaign whose premise is "you need
 * a better website" — even though the AI's own separate `leadPriority`
 * signal agreed it wasn't a priority lead.
 *
 * Only three overrides are implemented — "closed business", "national
 * chain", and "government organization" from the Stage 15 spec are
 * deliberately NOT enforced here yet: no field on `Business` persists any
 * of those signals today. Google Places' `businessStatus` is fetched live
 * during discovery but explicitly never persisted (see Stage 12, "review
 * context only — never persisted"), and there is no chain/government
 * classification anywhere in the domain model. Until one of those signals
 * is actually captured, the AI's own qualification is used for those
 * cases — it can still down-rank or explain a closed/chain/government
 * business in `assessment.weaknesses`/`executiveSummary`, just without a
 * code-enforced override. "Invalid address" is similarly unenforced —
 * `Business.address` has no validity flag today.
 */

const WEBSITE_UNAVAILABLE_CATEGORIES: ReadonlySet<ScanFailureCategory> = new Set([
  'website_unreachable',
  'website_error_response',
  'blocked_url',
  'invalid_url',
]);

/**
 * A business scoring at or above this on its *existing* site, combined
 * with the AI's own `leadPriority: 'low'` verdict, is conservatively
 * treated as "doesn't need us" rather than auto-qualified — both of the
 * AI's independent signals have to agree; a high score paired with
 * medium/high priority is left to the AI's own `qualification` call, since
 * the model may have a reason (e.g. a strong desktop score masking a poor
 * mobile experience) not captured by `overallScore` alone.
 */
const HIGH_QUALITY_EXISTING_SITE_SCORE_THRESHOLD = 80;

export interface ApplyQualificationOverridesInput {
  business: Business;
  aiQualification: QualificationResult;
  /**
   * The AI's own score/priority for this attempt — optional because
   * `handleWebsiteUnavailable`'s call site never ran the AI at all (Firecrawl
   * already failed, so there's nothing to score). The rule below simply
   * doesn't apply without both.
   */
  overallScore?: number;
  leadPriority?: LeadPriority;
  /** The failure category of the business's most recent Firecrawl scan, if it failed. */
  firecrawlFailureCategory?: ScanFailureCategory;
}

export function applyQualificationOverrides({
  business,
  aiQualification,
  overallScore,
  leadPriority,
  firecrawlFailureCategory,
}: ApplyQualificationOverridesInput): QualificationResult {
  if (!business.websiteUrl?.trim()) return 'qualified';
  if (firecrawlFailureCategory && WEBSITE_UNAVAILABLE_CATEGORIES.has(firecrawlFailureCategory)) {
    return 'manual_review';
  }
  if (overallScore !== undefined && overallScore >= HIGH_QUALITY_EXISTING_SITE_SCORE_THRESHOLD && leadPriority === 'low') {
    return 'manual_review';
  }
  return aiQualification;
}
