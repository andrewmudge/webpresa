import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { ensureCustomerOnboarding } from '@/lib/onboarding/ensure';
import { canAccessOnboardingStep } from '@/lib/onboarding/steps';
import { OnboardingProgress } from '../OnboardingProgress';
import { completeTourAction } from '../actions';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
}

/**
 * Minimal placeholder — Part 4 replaces this with the full illustrated
 * dashboard orientation (implementation.md, Stage 19.x, Part 4). Completion
 * vs. skip is already recorded as distinct outcomes so Part 4's analytics
 * and replay entry point don't need a schema change.
 */
export default async function OnboardingTourPage({ params }: Props) {
  const { businessId } = await params;
  const session = await requireCustomerSession();
  await requireBusinessOwnership(session.sub, businessId);
  const { mode } = await requireBusinessAccess(session.sub, businessId);
  if (mode !== 'full') redirect(`/app/businesses/${businessId}`);

  const onboarding = await ensureCustomerOnboarding(businessId, session.sub);
  if (onboarding.status === 'completed') redirect(`/app/onboarding/${businessId}`);
  if (!canAccessOnboardingStep(onboarding.completedSteps, 'tour')) {
    redirect(`/app/onboarding/${businessId}/publish`);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <OnboardingProgress current="tour" completed={onboarding.completedSteps} />
      <h1 className="text-xl font-bold text-gray-900">You&apos;re all set</h1>
      <p className="mt-3 text-sm text-gray-600">
        Your dashboard is where you&apos;ll edit your website, change its design, manage billing, and update your
        business information.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <form action={completeTourAction.bind(null, businessId, 'completed')}>
          <button
            type="submit"
            className="rounded-lg bg-(--color-brand) text-white px-5 py-2.5 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
          >
            Go to my dashboard
          </button>
        </form>
        <form action={completeTourAction.bind(null, businessId, 'skipped')}>
          <button type="submit" className="text-sm font-medium text-gray-600 underline">
            Skip tour
          </button>
        </form>
      </div>
    </div>
  );
}
