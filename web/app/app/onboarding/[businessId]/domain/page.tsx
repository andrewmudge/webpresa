import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { listDomainConnectionsForBusiness } from '@/lib/db/domain-connections';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { ensureCustomerOnboarding } from '@/lib/onboarding/ensure';
import { canAccessOnboardingStep } from '@/lib/onboarding/steps';
import { resolveAppBaseUrl } from '@/lib/env/app-base-url';
import { OnboardingShell } from '../OnboardingShell';
import { OnboardingProgress } from '../OnboardingProgress';
import { OnboardingStepLayout } from '../OnboardingStepLayout';
import { OnboardingActionBar } from '../OnboardingActionBar';
import { WebsitePreviewPanel } from '../WebsitePreviewPanel';
import { DomainChoiceCards } from './DomainChoiceCards';
import { DomainStatusPanel } from './DomainStatusPanel';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ error?: string }>;
}

/**
 * Part 2 upgrades this route (unchanged since Part 1) with a real "connect a
 * domain I already own" flow — DNS connection only, never a registrar
 * transfer. Part 3 adds the third "buy a new domain" choice to this same
 * page (implementation.md, Stage 19.x, Part 1, "Major deliverables").
 */
export default async function OnboardingDomainPage({ params, searchParams }: Props) {
  const { businessId } = await params;
  const { error } = await searchParams;
  const session = await requireCustomerSession();
  const business = await requireBusinessOwnership(session.sub, businessId);
  const { mode } = await requireBusinessAccess(session.sub, businessId);
  if (mode !== 'full') redirect(`/app/businesses/${businessId}`);

  // Unlike Review/Publish/Tour, this route is deliberately re-enterable
  // after onboarding has already completed — the dashboard's persistent
  // "Connect your domain" setup item links straight back here, and domain
  // setup must be resumable independently of the rest of the wizard (see
  // implementation.md, Stage 19.x, "Deferred-domain flow").
  const onboarding = await ensureCustomerOnboarding(businessId, session.sub);
  if (onboarding.status !== 'completed' && !canAccessOnboardingStep(onboarding.completedSteps, 'domain')) {
    redirect(`/app/onboarding/${businessId}/review`);
  }

  const [connections, previews] = await Promise.all([
    listDomainConnectionsForBusiness(businessId),
    listPreviewsForBusiness(businessId),
  ]);
  const connection = connections.find((c) => c.status !== 'disconnected') ?? null;
  const latest = previews[0];
  const hasDraft = !!latest && latest.status !== 'published';

  // The address bar shows the real, eventual public address for this
  // domain state — the connected domain once truly `active`, never a
  // fabricated subdomain, and the app's own `/b/{slug}` URL otherwise.
  const displayUrl =
    connection?.status === 'active'
      ? connection.normalizedDomain
      : `${resolveAppBaseUrl().replace(/^https?:\/\//, '')}/b/${business.slug}`;

  return (
    <OnboardingShell businessName={business.name}>
      <OnboardingProgress businessId={businessId} current="domain" completed={onboarding.completedSteps} />

      <div className="mt-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Choose your website address</h1>
        <p className="mt-2 max-w-xl text-sm text-gray-600">
          Connect a domain you already own, or use your Webpresa address for now — you can always connect a domain
          later from your dashboard.
        </p>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <OnboardingStepLayout
        left={
          connection ? (
            <DomainStatusPanel
              businessId={businessId}
              domainName={connection.domainName}
              normalizedDomain={connection.normalizedDomain}
              domainConnectionId={connection.domainConnectionId}
              initialStatus={connection.status}
              initialVerificationRecords={connection.verificationRecords ?? []}
              initialFailureCategory={connection.failureCategory ?? null}
            />
          ) : (
            <DomainChoiceCards businessId={businessId} displayUrl={displayUrl} />
          )
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
          <Link href={`/app/onboarding/${businessId}/leads`} className="text-sm font-medium text-gray-500 hover:text-gray-700">
            Back
          </Link>
        }
        status={
          <span className="text-gray-400">
            {connection ? 'Continue above once your domain is ready.' : 'Choose an option above to continue.'}
          </span>
        }
      />
    </OnboardingShell>
  );
}
