import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { ensureCustomerOnboarding } from '@/lib/onboarding/ensure';
import { canAccessOnboardingStep } from '@/lib/onboarding/steps';
import { OnboardingShell } from '../OnboardingShell';
import { OnboardingProgress } from '../OnboardingProgress';
import { SectionCard } from '../SectionCard';
import { completeTourAction } from '../actions';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
}

/**
 * Minimal placeholder — Part 4 replaces this with the full illustrated
 * dashboard orientation (implementation.md, Stage 19.x, Part 4). Completion
 * vs. skip is already recorded as distinct outcomes so Part 4's analytics
 * and replay entry point don't need a schema change. Wrapped in the new
 * onboarding shell for visual consistency with the other three steps only —
 * deliberately not otherwise redesigned yet.
 */
export default async function OnboardingTourPage({ params }: Props) {
  const { businessId } = await params;
  const session = await requireCustomerSession();
  const business = await requireBusinessOwnership(session.sub, businessId);
  const { mode } = await requireBusinessAccess(session.sub, businessId);
  if (mode !== 'full') redirect(`/app/businesses/${businessId}`);

  const onboarding = await ensureCustomerOnboarding(businessId, session.sub);
  if (onboarding.status === 'completed') redirect(`/app/onboarding/${businessId}`);
  if (!canAccessOnboardingStep(onboarding.completedSteps, 'tour')) {
    redirect(`/app/onboarding/${businessId}/publish`);
  }

  return (
    <OnboardingShell businessName={business.name}>
      <OnboardingProgress businessId={businessId} current="tour" completed={onboarding.completedSteps} />

      <div className="mx-auto mt-8 max-w-lg text-center">
        <h1 className="text-2xl font-bold text-gray-900">Your website is live</h1>
        <div className="mt-6 text-left">
          <SectionCard title="What's in your dashboard">
            <p className="text-sm text-gray-600">
              Your dashboard is where you&apos;ll edit your website, change its design, manage billing, and update
              your business information.
            </p>
          </SectionCard>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <form action={completeTourAction.bind(null, businessId, 'completed')}>
            <button
              type="submit"
              className="w-full rounded-lg bg-(--color-brand) px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-(--color-brand-dark) sm:w-auto"
            >
              Go to my dashboard
            </button>
          </form>
          <form action={completeTourAction.bind(null, businessId, 'skipped')}>
            <button type="submit" className="text-sm font-medium text-gray-500 underline hover:text-gray-700">
              Skip tour
            </button>
          </form>
        </div>
      </div>
    </OnboardingShell>
  );
}
