import type { ScanWorkflowStep } from '@/domain/models/scan-execution';

/**
 * Maps the internal 12-value `ScanWorkflowStep` enum (and the has-website /
 * no-website branch, since the two paths visit different steps) to the
 * small set of customer-facing progress labels — never provider names
 * (Firecrawl, OpenAI, Playwright, Step Functions), those are implementation
 * details. A pure, single-purpose function, same shape as
 * `resolveIsIndexable`/`getClaimBannerState` — unit-testable independent of
 * the polling/rendering code that calls it.
 *
 * Not every customer-facing label has a distinct backend signal — copy/theme
 * selection both happen inside one `generating_preview` step, so "Writing
 * your website" and "Designing your site" collapse to the same backend
 * position here rather than inventing a signal that doesn't exist; the
 * label simply holds until the next real step transition.
 */
export interface ProgressLabel {
  label: string;
  /** 1-based position for a progress bar/step indicator; out of `totalSteps`. */
  position: number;
  totalSteps: number;
}

const HAS_WEBSITE_STAGES = [
  'Business information received',
  'Analyzing your current website',
  'Reviewing your services',
  'Writing your website',
  'Designing your site',
  'Publishing your website',
] as const;

const NO_WEBSITE_STAGES = [
  'Business information received',
  'Reviewing your services',
  'Writing your website',
  'Designing your site',
  'Preparing your photos',
  'Publishing your website',
] as const;

const HAS_WEBSITE_STEP_POSITIONS: Partial<Record<ScanWorkflowStep, number>> = {
  crawling: 1,
  capturing_source_screenshots: 2,
  scoring: 2,
  qualifying: 2,
  generating_preview: 3, // spans "Writing" (3) and "Designing" (4) — see doc comment
  capturing_preview_screenshots: 5,
  finalizing: 5,
  queueing_manual_review: 5,
};

const NO_WEBSITE_STEP_POSITIONS: Partial<Record<ScanWorkflowStep, number>> = {
  recording_no_website: 1,
  scoring: 1,
  qualifying: 1,
  generating_preview: 2, // spans "Writing" (2) and "Designing" (3) — see doc comment
  capturing_preview_screenshots: 4, // "Preparing your photos" — cosmetic; photos are already uploaded by this point
  finalizing: 5,
  queueing_manual_review: 5,
};

/** `currentStep` is `undefined` right after creation (still `queued`) — that's stage 0, the first stage, not "unknown." */
export function resolveProgressLabel(
  currentStep: ScanWorkflowStep | undefined,
  hasExistingWebsite: boolean,
): ProgressLabel {
  const stages = hasExistingWebsite ? HAS_WEBSITE_STAGES : NO_WEBSITE_STAGES;
  const positions = hasExistingWebsite ? HAS_WEBSITE_STEP_POSITIONS : NO_WEBSITE_STEP_POSITIONS;
  const index = (currentStep && positions[currentStep]) ?? 0;
  return { label: stages[index], position: index + 1, totalSteps: stages.length };
}
