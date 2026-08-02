import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { adminGetCustomerProfileBySub } from '@/lib/auth/customer-cognito';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { listDomainConnectionsForBusiness } from '@/lib/db/domain-connections';
import { getCustomerOnboardingByBusinessId } from '@/lib/db/customer-onboarding';
import { ensureCustomerOnboarding } from '@/lib/onboarding/ensure';
import { deriveWebsiteStatus } from '@/lib/customer-editing/site-status';
import { createBillingPortalSessionAction } from '@/app/account/checkout/actions';
import { StatusCard } from './StatusCard';
import { WebsiteHealthCard } from './WebsiteHealthCard';
import { RecentActivityCard } from './RecentActivityCard';
import { ActionRequiredCard } from './ActionRequiredCard';
import { SupportCard } from './SupportCard';
import {
  resolveWebsiteCardStatus,
  resolveDomainCardStatus,
  resolveSslCardStatus,
  resolveSubscriptionCardStatus,
  resolveGreetingSubtext,
  buildWebsiteHealthItems,
  computeHealthSummary,
  buildActionItems,
  buildRecentActivity,
} from './overview-status';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ error?: string; published?: string }>;
}

/**
 * Overview — a "Website Health" dashboard. Answers: is my site online, is my
 * domain connected, is it secure, is my subscription active, are there
 * unpublished changes, does anything need my attention, what happened
 * recently. Deliberately excludes traffic/analytics (deferred), the live
 * preview iframe (moved exclusively to `website/page.tsx`), and any editing
 * actions (Website section only). See `overview-status.ts` for the typed
 * presentation logic and implementation.md for the constraints this encodes.
 */
export default async function BusinessHomePage({ params, searchParams }: Props) {
  const { businessId } = await params;
  const { error, published } = await searchParams;
  const session = await requireCustomerSession();
  const business = await requireBusinessOwnership(session.sub, businessId);
  const { mode } = await requireBusinessAccess(session.sub, businessId);

  if (mode === 'none') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">{business.name}</h1>
        <p className="mt-3 text-sm text-gray-600">
          {business.subscriptionStatus === 'canceled'
            ? 'Your subscription has ended. Reactivate to manage and publish your website again.'
            : 'This business isn’t activated yet. Choose a plan to unlock your dashboard.'}
        </p>
        <Link
          href="/account/claim-status"
          className="mt-6 inline-block rounded-lg bg-(--color-brand) text-white px-5 py-2.5 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
        >
          {business.subscriptionStatus === 'canceled' ? 'Reactivate' : 'Choose a plan'}
        </Link>
      </div>
    );
  }

  // Stage 19.x, Part 1 — post-Checkout onboarding routing. Only the very
  // first `full`-mode visit (no onboarding record exists yet) is force-
  // routed into the wizard; once a record exists the customer has already
  // seen it at least once (whether they finished it or chose "Go to
  // dashboard" early), so every later visit here just shows a resume notice
  // instead of bouncing them back in — see implementation.md, Stage 19.x,
  // Part 1, "Major deliverables" ("Stage 19 dashboard hook") vs.
  // "Post-Checkout routing".
  let onboarding = mode === 'full' ? await getCustomerOnboardingByBusinessId(businessId) : null;
  if (mode === 'full' && !onboarding) {
    onboarding = await ensureCustomerOnboarding(businessId, session.sub);
    redirect(`/app/onboarding/${businessId}`);
  }

  const isReadOnly = mode === 'billing_recovery';

  const profile = await adminGetCustomerProfileBySub(session.sub);
  const greeting = profile?.firstName ? `Welcome back, ${profile.firstName}!` : 'Welcome back!';

  const previews = await listPreviewsForBusiness(businessId);
  const { state: websiteState, hasDraft, latest, publishedPreview } = deriveWebsiteStatus(previews);

  // "View website" prefers an active custom domain over `/b/{slug}` — the
  // same resolution the Billing page uses, including its "never fabricate a
  // *.webpresa.io-style address" convention of just showing `/b/{slug}` as
  // both the href and the display text when no custom domain is active.
  const domainConnections = await listDomainConnectionsForBusiness(businessId);
  const domainConnection = domainConnections.find((c) => c.status !== 'disconnected') ?? null;
  const isDomainActive = domainConnection?.status === 'active';
  const publicUrl = isDomainActive ? `https://${domainConnection!.primaryHostname}` : `/b/${business.slug}`;

  const websiteCardStatus = resolveWebsiteCardStatus(websiteState);
  const domainCardStatus = resolveDomainCardStatus(domainConnection, publicUrl);
  const sslCardStatus = resolveSslCardStatus(domainConnection);
  const subscriptionCardStatus = resolveSubscriptionCardStatus(business);

  const healthItems = buildWebsiteHealthItems({ websiteState, hasDraft, publishedPreview, domainConnection, business });
  const healthSummary = computeHealthSummary(healthItems, websiteState);

  const actionItems = buildActionItems({ hasDraft, websiteState, latest, domainConnection, isReadOnly, businessId });
  const activityEntries = buildRecentActivity({
    publishedPreview,
    hasDraft,
    latest,
    domainConnection,
    claimedAt: business.claimedAt,
  });

  return (
    <div className="py-8 space-y-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {error && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {decodeURIComponent(error)}
          </div>
        )}
        {published && (
          <div role="status" className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            <CheckCircle2 size={16} /> Your changes are live.
          </div>
        )}

        {onboarding && onboarding.status !== 'completed' && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
            <span>Finish setting up your website.</span>
            <Link href={`/app/onboarding/${businessId}`} className="shrink-0 font-medium underline">
              Continue onboarding
            </Link>
          </div>
        )}

        {isReadOnly && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <span className="flex items-center gap-2">
              <AlertTriangle size={16} /> There&apos;s a problem with your last payment. Editing is paused until it&apos;s resolved.
            </span>
            <form action={createBillingPortalSessionAction.bind(null, businessId)}>
              <button type="submit" className="shrink-0 font-medium underline">
                Fix billing
              </button>
            </form>
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{greeting}</h1>
            <p className="mt-1 text-sm text-gray-600">{resolveGreetingSubtext(healthSummary)}</p>
          </div>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            View Live Site
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard label="Website" status={websiteCardStatus} action={{ label: 'Visit Website', href: publicUrl, external: true }} />
          <StatusCard
            label="Domain"
            status={domainCardStatus}
            action={{
              label: domainConnection ? 'Manage Domain' : 'Connect Domain',
              href: `/app/onboarding/${businessId}/domain`,
            }}
          />
          <StatusCard label="SSL" status={sslCardStatus} />
          <StatusCard
            label="Subscription"
            status={subscriptionCardStatus}
            action={{ label: 'Manage Subscription', href: `/app/businesses/${businessId}/billing` }}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <WebsiteHealthCard summary={healthSummary} items={healthItems} />
          <RecentActivityCard entries={activityEntries} />
        </div>

        <ActionRequiredCard businessId={businessId} items={actionItems} />

        <SupportCard />
      </div>
    </div>
  );
}
