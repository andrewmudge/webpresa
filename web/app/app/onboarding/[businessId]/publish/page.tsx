import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { listDomainConnectionsForBusiness } from '@/lib/db/domain-connections';
import { ensureCustomerOnboarding } from '@/lib/onboarding/ensure';
import { canAccessOnboardingStep } from '@/lib/onboarding/steps';
import { resolveAppBaseUrl } from '@/lib/env/app-base-url';
import { OnboardingShell } from '../OnboardingShell';
import { OnboardingProgress } from '../OnboardingProgress';
import { OnboardingStepLayout } from '../OnboardingStepLayout';
import { OnboardingActionBar } from '../OnboardingActionBar';
import { OnboardingPrimaryButton } from '../OnboardingPrimaryButton';
import { SectionCard } from '../SectionCard';
import { StatusChecklist } from '../StatusChecklist';
import { WebsitePreviewPanel } from '../WebsitePreviewPanel';
import { publishOnboardingAction, continueWithDraftAction } from '../actions';

const PUBLISH_FORM_ID = 'publish-form';

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

  const [previews, connections] = await Promise.all([
    listPreviewsForBusiness(businessId),
    listDomainConnectionsForBusiness(businessId),
  ]);
  const published = previews.find((p) => p.status === 'published');
  const latest = previews[0];
  const hasDraft = !!latest && latest.status !== 'published';
  const connection = connections.find((c) => c.status !== 'disconnected') ?? null;
  const domainReady = !connection || connection.status === 'active';

  const displayUrl =
    connection?.status === 'active'
      ? connection.normalizedDomain
      : `${resolveAppBaseUrl().replace(/^https?:\/\//, '')}/b/${business.slug}`;

  const checklistItems = [
    { label: 'Business information confirmed', done: !!business.name && !!(business.phone || business.email) },
    { label: 'Subscription active', done: business.subscriptionStatus === 'active' },
    { label: 'Domain ready', done: domainReady },
    { label: 'Website preview available', done: !!latest },
  ];

  return (
    <OnboardingShell businessName={business.name}>
      <OnboardingProgress businessId={businessId} current="publish" completed={onboarding.completedSteps} />

      <div className="mt-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Ready to launch?</h1>
        <p className="mt-2 max-w-xl text-sm text-gray-600">
          Review the final details below and publish your website when you&apos;re ready.
        </p>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <OnboardingStepLayout
        left={
          <div className="space-y-5">
            <SectionCard title="Launch checklist">
              <StatusChecklist items={checklistItems} />
            </SectionCard>

            {!latest && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Your website isn&apos;t ready to preview yet. Contact support if this doesn&apos;t resolve shortly.
              </div>
            )}

            {latest && (
              <SectionCard
                title={published && !hasDraft ? 'Your website is published' : 'Publishing makes your website public'}
                description={
                  published && !hasDraft
                    ? 'Your site is already live at the address shown on the right. Continue when you’re ready.'
                    : "Publishing takes your current draft live at the address shown on the right — visible to anyone, immediately."
                }
              >
                <form id={PUBLISH_FORM_ID} action={publishOnboardingAction.bind(null, businessId)}>
                  {hasDraft && <input type="hidden" name="previewId" value={latest.previewId} />}
                </form>
              </SectionCard>
            )}

            <form action={continueWithDraftAction.bind(null, businessId)}>
              <button type="submit" className="text-sm font-medium text-gray-500 underline hover:text-gray-700">
                Enter my dashboard for now
              </button>
            </form>
          </div>
        }
        right={
          <div className="lg:sticky lg:top-6">
            <WebsitePreviewPanel slug={business.slug} displayUrl={displayUrl} hasDraft={hasDraft} lastUpdated={latest?.updatedAt} />
          </div>
        }
      />

      <OnboardingActionBar
        back={
          <Link href={`/app/onboarding/${businessId}/domain`} className="text-sm font-medium text-gray-500 hover:text-gray-700">
            Back to domain
          </Link>
        }
        primary={
          latest && (
            <OnboardingPrimaryButton
              action={publishOnboardingAction.bind(null, businessId)}
              externalFormId={PUBLISH_FORM_ID}
              label={published && !hasDraft ? 'Continue' : 'Publish my website'}
              pendingLabel="Publishing…"
            />
          )
        }
      />
    </OnboardingShell>
  );
}
