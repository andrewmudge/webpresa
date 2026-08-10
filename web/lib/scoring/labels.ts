import type { QualificationResult, LeadPriority } from '@/domain/models/website-assessment';

/**
 * Shared display strings for `QualificationResult` — the single source of
 * truth for both the per-business detail page (`ScoringSection.tsx`) and
 * the businesses list (`BusinessTable.tsx`), so wording/colors can't drift
 * between the two views.
 */

export const QUALIFICATION_LABELS: Record<QualificationResult, string> = {
  qualified: 'Qualified',
  manual_review: 'Manual Review',
  reject: 'Reject',
};

export const QUALIFICATION_TONE: Record<QualificationResult, string> = {
  qualified: 'bg-green-50 text-green-700 border-green-200',
  manual_review: 'bg-amber-50 text-amber-700 border-amber-200',
  reject: 'bg-red-50 text-red-700 border-red-200',
};

/** Shared display strings for `LeadPriority` — mirrors `QUALIFICATION_LABELS`/`QUALIFICATION_TONE` above. */
export const LEAD_PRIORITY_LABELS: Record<LeadPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const LEAD_PRIORITY_TONE: Record<LeadPriority, string> = {
  high: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-gray-50 text-gray-700 border-gray-200',
};
