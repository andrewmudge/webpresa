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

/** Shared step indicator across every onboarding page — purely presentational, no auth/data logic. */
export function OnboardingProgress({
  current,
  completed,
}: {
  current: OnboardingStep;
  completed: OnboardingCompletableStep[];
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs font-medium mb-8">
      {ONBOARDING_COMPLETABLE_STEPS.map((step, i) => {
        const isDone = completed.includes(step);
        const isCurrent = step === current;
        return (
          <li key={step} className="flex items-center gap-1.5">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                isCurrent
                  ? 'bg-(--color-brand) text-white'
                  : isDone
                    ? 'bg-gray-300 text-gray-700'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i + 1}
            </span>
            <span className={isCurrent ? 'text-(--color-brand)' : isDone ? 'text-gray-600' : 'text-gray-400'}>
              {STEP_LABELS[step]}
            </span>
            {i < ONBOARDING_COMPLETABLE_STEPS.length - 1 && <span className="mx-1 text-gray-300">→</span>}
          </li>
        );
      })}
    </ol>
  );
}
