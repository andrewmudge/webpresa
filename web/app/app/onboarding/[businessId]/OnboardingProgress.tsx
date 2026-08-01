import Link from 'next/link';
import { Check } from 'lucide-react';
import {
  ONBOARDING_COMPLETABLE_STEPS,
  type OnboardingCompletableStep,
  type OnboardingStep,
} from '@/domain/models/customer-onboarding';

const STEP_LABELS: Record<OnboardingCompletableStep, string> = {
  review: 'Review',
  domain: 'Domain',
  publish: 'Publish',
  tour: 'Tour',
};

const STEP_SUBLABELS: Record<OnboardingCompletableStep, string> = {
  review: 'Business information',
  domain: 'Choose your address',
  publish: 'Go live',
  tour: 'Learn the basics',
};

function stepHref(businessId: string, step: OnboardingCompletableStep): string {
  return `/app/onboarding/${businessId}/${step}`;
}

/**
 * Shared step indicator across every onboarding page — purely presentational,
 * no auth/data logic. Completed steps (and the current one) are clickable —
 * safe to do with no extra authorization here, since every step page
 * independently re-validates `canAccessOnboardingStep` server-side on load,
 * so this can only ever offer a shortcut backward, never actually skip
 * anything ahead.
 *
 * Collapses to a compact "Step X of 4" treatment below `sm` — the full
 * 4-across tracker doesn't fit a phone width without wrapping awkwardly.
 */
export function OnboardingProgress({
  businessId,
  current,
  completed,
}: {
  businessId: string;
  current: OnboardingStep;
  completed: OnboardingCompletableStep[];
}) {
  const currentIndex = ONBOARDING_COMPLETABLE_STEPS.findIndex((step) => step === current);

  return (
    <div className="rounded-2xl border border-(--color-border) bg-white p-4 shadow-sm sm:p-5">
      {/* Compact mobile treatment */}
      {currentIndex >= 0 && (
        <div className="sm:hidden">
          <p className="text-xs font-medium text-gray-400">
            Step {currentIndex + 1} of {ONBOARDING_COMPLETABLE_STEPS.length}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-(--color-brand)">{STEP_LABELS[current as OnboardingCompletableStep]}</p>
        </div>
      )}

      {/* Full tracker */}
      <ol className="hidden sm:flex sm:flex-wrap sm:items-start sm:gap-x-2 sm:gap-y-4">
        {ONBOARDING_COMPLETABLE_STEPS.map((step, i) => {
          const isDone = completed.includes(step);
          const isCurrent = step === current;
          const isReachable = isDone || isCurrent;

          const badge = (
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                isCurrent
                  ? 'bg-(--color-brand) text-white'
                  : isDone
                    ? 'bg-(--color-brand-muted) text-(--color-brand)'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {isDone && !isCurrent ? <Check size={14} /> : i + 1}
            </span>
          );
          const labels = (
            <span className="flex flex-col">
              <span className={`text-sm font-semibold ${isCurrent ? 'text-(--color-brand)' : isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                {STEP_LABELS[step]}
              </span>
              <span className={`text-xs ${isCurrent || isDone ? 'text-gray-500' : 'text-gray-300'}`}>{STEP_SUBLABELS[step]}</span>
            </span>
          );

          return (
            <li key={step} className="flex items-start gap-2">
              {isDone && !isCurrent ? (
                <Link href={stepHref(businessId, step)} className="flex items-start gap-2 hover:opacity-75 transition-opacity">
                  {badge}
                  {labels}
                </Link>
              ) : (
                <span className="flex items-start gap-2" aria-current={isCurrent ? 'step' : undefined}>
                  {badge}
                  {labels}
                </span>
              )}
              {i < ONBOARDING_COMPLETABLE_STEPS.length - 1 && (
                <span className={`mx-1 mt-1.5 h-px w-6 lg:w-10 ${isReachable ? 'bg-gray-300' : 'bg-gray-200'}`} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
