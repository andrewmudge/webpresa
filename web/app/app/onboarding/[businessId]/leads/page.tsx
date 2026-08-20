import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { ensureCustomerOnboarding } from '@/lib/onboarding/ensure';
import { canAccessOnboardingStep } from '@/lib/onboarding/steps';
import { resolveAppBaseUrl } from '@/lib/env/app-base-url';
import { TextField } from '@/app/app/(dashboard)/businesses/[businessId]/FormBits';
import { OnboardingShell } from '../OnboardingShell';
import { OnboardingProgress } from '../OnboardingProgress';
import { OnboardingStepLayout } from '../OnboardingStepLayout';
import { OnboardingActionBar } from '../OnboardingActionBar';
import { OnboardingPrimaryButton } from '../OnboardingPrimaryButton';
import { SectionCard } from '../SectionCard';
import { WebsitePreviewPanel } from '../WebsitePreviewPanel';
import { completeLeadsAction } from '../actions';

const LEADS_FORM_ID = 'leads-form';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ error?: string }>;
}

/**
 * Only reached when the Review step left `Business.email` unset — the
 * common case (an email was already provided) auto-completes this step and
 * skips it entirely (see `completeReviewAction`). Editable later from
 * Settings → Notifications.
 */
export default async function OnboardingLeadsPage({ params, searchParams }: Props) {
  const { businessId } = await params;
  const { error } = await searchParams;
  const session = await requireCustomerSession();
  const business = await requireBusinessOwnership(session.sub, businessId);
  const { mode } = await requireBusinessAccess(session.sub, businessId);
  if (mode !== 'full') redirect(`/app/businesses/${businessId}`);

  const onboarding = await ensureCustomerOnboarding(businessId, session.sub);
  if (onboarding.status === 'completed') redirect(`/app/onboarding/${businessId}`);
  if (!canAccessOnboardingStep(onboarding.completedSteps, 'leads')) {
    redirect(`/app/onboarding/${businessId}`);
  }

  const previews = await listPreviewsForBusiness(businessId);
  const latest = previews[0];
  const hasDraft = !!latest && latest.status !== 'published';
  const displayUrl = `${resolveAppBaseUrl().replace(/^https?:\/\//, '')}/b/${business.slug}`;

  return (
    <OnboardingShell businessName={business.name}>
      <OnboardingProgress businessId={businessId} current="leads" completed={onboarding.completedSteps} />

      <div className="mt-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Where should new leads go?</h1>
        <p className="mt-2 max-w-xl text-sm text-gray-600">
          Every time someone submits your website&apos;s Request Service form, we&apos;ll email it here. You can change this
          anytime from your dashboard&apos;s Notifications settings.
        </p>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <OnboardingStepLayout
        left={
          <SectionCard title="Lead notifications">
            <form id={LEADS_FORM_ID} action={completeLeadsAction.bind(null, businessId)}>
              <TextField
                label="Email address"
                name="leadNotificationEmail"
                type="email"
                placeholder="you@yourbusiness.com"
                required
                autoComplete="email"
              />
            </form>
          </SectionCard>
        }
        right={
          <div className="lg:sticky lg:top-6">
            <WebsitePreviewPanel
              key={`${business.updatedAt}:${latest?.updatedAt ?? ''}`}
              slug={business.slug}
              displayUrl={displayUrl}
              hasDraft={hasDraft}
              lastUpdated={latest?.updatedAt}
            />
          </div>
        }
      />

      <OnboardingActionBar
        back={
          <Link href={`/app/onboarding/${businessId}/review`} className="text-sm font-medium text-gray-500 hover:text-gray-700">
            Back to review
          </Link>
        }
        primary={
          <OnboardingPrimaryButton
            action={completeLeadsAction.bind(null, businessId)}
            externalFormId={LEADS_FORM_ID}
            label="Continue to domain"
            pendingLabel="Saving…"
          />
        }
      />
    </OnboardingShell>
  );
}
