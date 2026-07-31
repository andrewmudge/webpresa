import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { ensureCustomerOnboarding } from '@/lib/onboarding/ensure';
import { resolveEarliestIncompleteStep } from '@/lib/onboarding/steps';
import { Card } from '@/app/app/businesses/[businessId]/FormBits';
import { OnboardingProgress } from './OnboardingProgress';
import { completeWelcomeAction } from './actions';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
}

/**
 * Onboarding entry point (implementation.md, Stage 19.x, Part 1). Also the
 * "resume" landing page — a customer returning to `/app/onboarding/{id}`
 * after any progress is immediately forwarded to their actual next step, so
 * this route only ever renders the Welcome UI itself for a truly fresh
 * start.
 */
export default async function OnboardingWelcomePage({ params }: Props) {
  const { businessId } = await params;
  const session = await requireCustomerSession();
  const business = await requireBusinessOwnership(session.sub, businessId);
  const { mode } = await requireBusinessAccess(session.sub, businessId);

  if (mode === 'none') redirect(`/app/businesses/${businessId}`);

  const onboarding = await ensureCustomerOnboarding(businessId, session.sub);

  // A billing_recovery customer may only resume viewing an already-completed
  // record — never start or continue an in-progress one.
  if (mode === 'billing_recovery' && onboarding.status !== 'completed') {
    redirect(`/app/businesses/${businessId}`);
  }

  if (onboarding.status === 'completed') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">Your Webpresa website is set up.</h1>
        <p className="mt-3 text-sm text-gray-600">{business.name} is ready to go.</p>
        <Link
          href={`/app/businesses/${businessId}`}
          className="mt-6 inline-block rounded-lg bg-(--color-brand) text-white px-5 py-2.5 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
        >
          Go to my dashboard
        </Link>
      </div>
    );
  }

  const earliest = resolveEarliestIncompleteStep(onboarding.completedSteps);
  if (earliest !== 'welcome') {
    redirect(`/app/onboarding/${businessId}/${earliest}`);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <OnboardingProgress businessId={businessId} current="welcome" completed={onboarding.completedSteps} />
      <h1 className="text-2xl font-bold text-gray-900">Welcome to Webpresa</h1>
      <Card title="Your subscription is active">
        <p className="text-sm text-gray-600">Your website is ready for final setup.</p>
        <p className="mt-4 text-sm font-medium text-gray-700">We&apos;ll help you:</p>
        <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
          <li>Choose your website address</li>
          <li>Review your business information</li>
          <li>Preview and publish your site</li>
          <li>Learn where to make future updates</li>
        </ul>
      </Card>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form action={completeWelcomeAction.bind(null, businessId)}>
          <button
            type="submit"
            className="w-full sm:w-auto rounded-lg bg-(--color-brand) text-white px-5 py-2.5 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
          >
            Set up my website
          </button>
        </form>
        <Link href={`/app/businesses/${businessId}`} className="text-sm font-medium text-gray-600 underline">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
