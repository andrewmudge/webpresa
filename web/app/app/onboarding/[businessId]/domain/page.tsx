import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { listDomainConnectionsForBusiness } from '@/lib/db/domain-connections';
import { ensureCustomerOnboarding } from '@/lib/onboarding/ensure';
import { canAccessOnboardingStep } from '@/lib/onboarding/steps';
import type { DomainConnectionStatus } from '@/domain/models/domain-connection';
import { OnboardingProgress } from '../OnboardingProgress';
import {
  deferDomainAction,
  connectExistingDomainAction,
  checkDomainStatusAction,
  completeExistingDomainAction,
} from '../actions';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ error?: string }>;
}

const REGISTRAR_OPTIONS = [
  { value: 'godaddy', label: 'GoDaddy' },
  { value: 'wix', label: 'Wix' },
  { value: 'squarespace', label: 'Squarespace' },
  { value: 'namecheap', label: 'Namecheap' },
  { value: 'cloudflare', label: 'Cloudflare' },
  { value: 'hostinger', label: 'Hostinger' },
  { value: 'network_solutions', label: 'Network Solutions' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: "I'm not sure" },
] as const;

const STATUS_COPY: Record<DomainConnectionStatus, string> = {
  draft: 'Getting started.',
  awaiting_dns: 'Add the records below at your domain provider, then check again.',
  verifying: "We found your domain, but the new settings haven't finished updating yet. You can continue onboarding — we'll keep checking.",
  connected: 'Domain connected. Securing your website...',
  certificate_pending: 'Almost there — this usually takes just a minute.',
  active: 'Your domain is live.',
  failed: "We couldn't verify this domain. Double-check the records below and try again, or contact us for help.",
  disconnected: 'This domain is no longer connected.',
  expired: 'This domain connection has expired.',
};

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
  const isLive = connection?.status === 'active';
  const isTerminalFailure = connection?.status === 'failed' || connection?.status === 'expired';
  const showRecords = !!connection && !isLive && (connection.verificationRecords?.length ?? 0) > 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <OnboardingProgress current="domain" completed={onboarding.completedSteps} />
      <h1 className="text-2xl font-bold text-gray-900">Website address</h1>
      <p className="mt-2 text-sm text-gray-600">Choose how customers will find your website online.</p>

      {error && (
        <div role="alert" className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {connection ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">{connection.domainName}</h2>
            <p className="mt-1 text-sm text-gray-600">{STATUS_COPY[connection.status]}</p>

            {showRecords && (
              <div className="mt-4 space-y-2">
                {connection.verificationRecords!.map((rec, i) => (
                  <div key={i} className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs font-mono text-gray-700">
                    <div>Type: {rec.recordType}</div>
                    <div>Name: {rec.name}</div>
                    <div>Value: {rec.value}</div>
                  </div>
                ))}
              </div>
            )}

            {!isLive && !isTerminalFailure && (
              <form action={checkDomainStatusAction.bind(null, businessId, connection.normalizedDomain)} className="mt-4">
                <button
                  type="submit"
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Check again
                </button>
              </form>
            )}
          </div>

          <form action={completeExistingDomainAction.bind(null, businessId, connection.domainConnectionId)}>
            <button
              type="submit"
              className={
                isLive
                  ? 'w-full rounded-lg bg-(--color-brand) text-white px-5 py-2.5 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors'
                  : 'text-sm font-medium text-gray-600 underline'
              }
            >
              {isLive ? 'Continue' : "Continue — I'll finish this later"}
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">Use a domain I already own</h2>
            <p className="mt-1 text-xs text-gray-500 mb-3">
              Connect a website address from GoDaddy, Wix, Squarespace, or another provider.
            </p>
            <form action={connectExistingDomainAction.bind(null, businessId)} className="space-y-3">
              <input
                type="text"
                name="domain"
                placeholder="coastalplumbing.com"
                required
                className="w-full rounded-lg border border-(--color-border) px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
              />
              <select
                name="registrarProvider"
                defaultValue=""
                className="w-full rounded-lg border border-(--color-border) px-3 py-2 text-sm text-gray-900"
              >
                <option value="">Where do you manage this domain? (optional)</option>
                {REGISTRAR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
              >
                Connect this domain
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 opacity-60">
            <h2 className="text-sm font-semibold text-gray-900">Buy a new domain</h2>
            <p className="mt-1 text-xs text-gray-500">Coming soon — search for and purchase a website address.</p>
          </div>

          <form action={deferDomainAction.bind(null, businessId)}>
            <button
              type="submit"
              className="w-full text-left rounded-2xl border-2 border-(--color-brand) bg-(--color-brand-muted) p-5 hover:bg-(--color-brand-muted)/80 transition-colors"
            >
              <h2 className="text-sm font-semibold text-gray-900">Use my Webpresa address for now</h2>
              <p className="mt-1 text-xs text-gray-600">
                Keep using your Webpresa website address. You can connect a domain anytime from your dashboard.
              </p>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
