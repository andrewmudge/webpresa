import Link from 'next/link';
import {
  ONBOARDING_COMPLETABLE_STEPS,
  type OnboardingCompletableStep,
  type OnboardingStep,
} from '@/domain/models/customer-onboarding';

const STEP_LABELS: Record<OnboardingCompletableStep, string> = {
  welcome: 'Welcome',
  review: 'Review',
  domain: 'Domain',
  publish: 'Publish',
  tour: 'Tour',
};

function stepHref(businessId: string, step: OnboardingCompletableStep): string {
  return step === 'welcome' ? `/app/onboarding/${businessId}` : `/app/onboarding/${businessId}/${step}`;
}

/**
 * Shared step indicator across every onboarding page — purely presentational,
 * no auth/data logic. Completed steps (and the current one) are clickable —
 * safe to do with no extra authorization here, since every step page
 * independently re-validates `canAccessOnboardingStep` server-side on load,
 * so this can only ever offer a shortcut backward, never actually skip
 * anything ahead.
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
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-8">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
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
                    ? 'bg-gray-300 text-gray-700'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i + 1}
            </span>
          );
          const label = (
            <span
              className={`text-sm sm:text-base font-semibold ${
                isCurrent ? 'text-(--color-brand)' : isDone ? 'text-gray-700' : 'text-gray-400'
              }`}
            >
              {STEP_LABELS[step]}
            </span>
          );

          return (
            <li key={step} className="flex items-center gap-2">
              {isDone && !isCurrent ? (
                <Link href={stepHref(businessId, step)} className="flex items-center gap-2 hover:opacity-75 transition-opacity">
                  {badge}
                  {label}
                </Link>
              ) : (
                <span className="flex items-center gap-2" aria-current={isCurrent ? 'step' : undefined}>
                  {badge}
                  {label}
                </span>
              )}
              {i < ONBOARDING_COMPLETABLE_STEPS.length - 1 && (
                <span className={`mx-1 ${isReachable ? 'text-gray-300' : 'text-gray-200'}`}>→</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
