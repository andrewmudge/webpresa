import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { ensureCustomerOnboarding } from '@/lib/onboarding/ensure';
import { canAccessOnboardingStep } from '@/lib/onboarding/steps';
import { WebsitePreviewCard } from '@/app/app/businesses/[businessId]/WebsitePreviewCard';
import { OnboardingProgress } from '../OnboardingProgress';
import { publishOnboardingAction, continueWithDraftAction } from '../actions';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function OnboardingPublishPage({ params, searchParams }: Props) {
  const { businessId } = await params;
  const { error } = await searchParams;
  const session = await requireCustomerSession();
  const business = await requireBusinessOwnership(session.sub, businessId);
  const { mode } = await requireBusinessAccess(session.sub, businessId);
  if (mode !== 'full') redirect(`/app/businesses/${businessId}`);

  const onboarding = await ensureCustomerOnboarding(businessId, session.sub);
  if (onboarding.status === 'completed') redirect(`/app/onboarding/${businessId}`);
  if (!canAccessOnboardingStep(onboarding.completedSteps, 'publish')) {
    redirect(`/app/onboarding/${businessId}/domain`);
  }

  const previews = await listPreviewsForBusiness(businessId);
  const published = previews.find((p) => p.status === 'published');
  const latest = previews[0];
  const hasDraft = !!latest && latest.status !== 'published';

  return (
    <div className="py-12">
      <div className="max-w-2xl mx-auto px-4">
        <OnboardingProgress businessId={businessId} current="publish" completed={onboarding.completedSteps} />
        <h1 className="text-2xl font-bold text-gray-900">Preview and publish</h1>
        <p className="mt-2 text-sm text-gray-600">Take a look, then publish your website to make it live.</p>

        {error && (
          <div role="alert" className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {decodeURIComponent(error)}
          </div>
        )}

        {!latest && (
          <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            Your website isn&apos;t ready to preview yet. Contact support if this doesn&apos;t resolve shortly.
          </div>
        )}
      </div>

      {/* Breaks out of the max-w-2xl column above — same "w-[95%]" breakout
          the dashboard home (`app/app/businesses/[businessId]/page.tsx`)
          uses for the identical `WebsitePreviewCard`, so the preview reads
          as the real site rather than a narrow, cramped thumbnail. */}
      {latest && (
        <div className="w-[95%] mx-auto mt-6">
          <WebsitePreviewCard slug={business.slug} lastUpdated={latest.updatedAt} hasDraft={hasDraft} />
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4">
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          {latest && (
            <form action={publishOnboardingAction.bind(null, businessId)}>
              {hasDraft && <input type="hidden" name="previewId" value={latest.previewId} />}
              <button
                type="submit"
                className="w-full sm:w-auto rounded-lg bg-(--color-brand) text-white px-5 py-2.5 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
              >
                {published && !hasDraft ? 'Continue' : 'Publish my website'}
              </button>
            </form>
          )}
          <form action={continueWithDraftAction.bind(null, businessId)}>
            <button type="submit" className="text-sm font-medium text-gray-600 underline">
              Enter my dashboard for now
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
