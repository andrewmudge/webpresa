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
 * "Go to my dashboard" hands off to the real guided walkthrough
 * (`DashboardTour.tsx`, mounted in the dashboard layout) via the
 * `?tour=start` param appended by `completeTourAction` — this page itself
 * stays a simple confirmation screen, not the tour surface. "Skip tour"
 * lands on a plain dashboard; the sidebar's "Take a tour" link is the only
 * way to see it after that. Completion vs. skip is recorded as distinct
 * outcomes independently of whether the customer actually finishes the live
 * walkthrough — see `completeTourStep`.
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
