import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { listDomainConnectionsForBusiness } from '@/lib/db/domain-connections';
import { ensureCustomerOnboarding } from '@/lib/onboarding/ensure';
import { canAccessOnboardingStep } from '@/lib/onboarding/steps';
import { OnboardingProgress } from '../OnboardingProgress';
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
  await requireBusinessOwnership(session.sub, businessId);
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

  const connections = await listDomainConnectionsForBusiness(businessId);
  const connection = connections.find((c) => c.status !== 'disconnected') ?? null;

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <OnboardingProgress businessId={businessId} current="domain" completed={onboarding.completedSteps} />
      <h1 className="text-2xl font-bold text-gray-900">Website address</h1>
      <p className="mt-2 text-sm text-gray-600">Choose how customers will find your website online.</p>

      {error && (
        <div role="alert" className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <div className="mt-6">
        {connection ? (
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
          <DomainChoiceCards businessId={businessId} />
        )}
      </div>
    </div>
  );
}
