import {
  ONBOARDING_COMPLETABLE_STEPS,
  type OnboardingCompletableStep,
  type OnboardingStep,
} from '@/domain/models/customer-onboarding';

/**
 * Pure step-order logic (implementation.md, Stage 19.x, Part 1, "Resume
 * behavior"). No I/O — deliberately importable from both server and client
 * code without a `server-only` guard.
 */

/** Returns the earliest step not yet in `completedSteps`, or `'complete'` once every step is. */
export function resolveEarliestIncompleteStep(completedSteps: OnboardingCompletableStep[]): OnboardingStep {
  for (const step of ONBOARDING_COMPLETABLE_STEPS) {
    if (!completedSteps.includes(step)) return step;
  }
  return 'complete';
}

/**
 * A requested step is reachable once onboarding is fully complete (free
 * navigation to revisit a finished flow), or when it does not skip ahead of
 * the earliest incomplete step — never browser-trusted, always re-derived
 * from the persisted `completedSteps` array.
 */
export function canAccessOnboardingStep(
  completedSteps: OnboardingCompletableStep[],
  requestedStep: OnboardingCompletableStep,
): boolean {
  const earliest = resolveEarliestIncompleteStep(completedSteps);
  if (earliest === 'complete') return true;
  return ONBOARDING_COMPLETABLE_STEPS.indexOf(requestedStep) <= ONBOARDING_COMPLETABLE_STEPS.indexOf(earliest);
}
