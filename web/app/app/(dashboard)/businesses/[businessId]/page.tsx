import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { listDomainConnectionsForBusiness } from '@/lib/db/domain-connections';
import { getCustomerOnboardingByBusinessId } from '@/lib/db/customer-onboarding';
import { ensureCustomerOnboarding } from '@/lib/onboarding/ensure';
import { deriveWebsiteStatus } from '@/lib/customer-editing/site-status';
import { PLAN_CATALOG } from '@/domain/constants/plan-catalog';
import { createBillingPortalSessionAction } from '@/app/account/checkout/actions';
import { WebsitePreviewCard } from './WebsitePreviewCard';
import { publishDraftActionCustomer } from './actions';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ error?: string; published?: string }>;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  live: { label: 'Live', className: 'bg-green-100 text-green-800' },
  draft: { label: 'Draft changes', className: 'bg-amber-100 text-amber-800' },
  none: { label: 'No live site', className: 'bg-gray-100 text-gray-600' },
};

function ChecklistItem({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-2 py-2.5 px-1 text-sm hover:bg-gray-50 rounded-lg -mx-1">
      <span className="text-gray-700">{label}</span>
      <span className="text-(--color-brand) text-xs font-medium">Do this →</span>
    </Link>
  );
}

export default async function BusinessHomePage({ params, searchParams }: Props) {
  const { businessId } = await params;
  const { error, published } = await searchParams;
  const session = await requireCustomerSession();
  const business = await requireBusinessOwnership(session.sub, businessId);
  const { mode, plan } = await requireBusinessAccess(session.sub, businessId);

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

  const previews = await listPreviewsForBusiness(businessId);
  const { state: websiteState, hasDraft, latest, publishedPreview } = deriveWebsiteStatus(previews);
  const badge = STATUS_BADGE[websiteState];
  const isReadOnly = mode === 'billing_recovery';

  // Stage 19.x, Part 2 — "View website" prefers an active custom domain over `/b/{slug}`.
  const domainConnections = await listDomainConnectionsForBusiness(businessId);
  const domainConnection = domainConnections.find((c) => c.status !== 'disconnected') ?? null;
  const isDomainActive = domainConnection?.status === 'active';
  const publicUrl = isDomainActive ? `https://${domainConnection!.primaryHostname}` : `/b/${business.slug}`;

  const checklist: { href: string; label: string }[] = [];
  if (!business.logoUrl) checklist.push({ href: `/app/businesses/${businessId}/website#logo`, label: 'Add your logo' });
  if (!business.photoUrls?.length) checklist.push({ href: `/app/businesses/${businessId}/website#photos`, label: 'Add photos of your business' });
  if (!business.phone && !business.email) checklist.push({ href: `/app/businesses/${businessId}/settings`, label: 'Add a way for customers to reach you' });
  if (!business.theme) checklist.push({ href: `/app/businesses/${businessId}/website#theme`, label: 'Choose a look for your website' });
  if (!publishedPreview) checklist.push({ href: `/app/businesses/${businessId}`, label: 'Publish your website' });
  if (!domainConnection || domainConnection.status === 'failed') {
    checklist.push({ href: `/app/onboarding/${businessId}/domain`, label: 'Connect your domain' });
  }

  return (
    <div className="py-8 space-y-6">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
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
      {!isReadOnly && business.cancelAtPeriodEnd && business.currentPeriodEnd && (
        <div role="alert" className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Your subscription is scheduled to cancel on{' '}
          {new Date(business.currentPeriodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {plan && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-(--color-brand-muted) text-(--color-brand)">
                {PLAN_CATALOG[plan].label}
              </span>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            View Live Site
          </a>
          {!isReadOnly && (
            <Link
              href={`/app/businesses/${businessId}/website`}
              className="rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
            >
              Edit website
            </Link>
          )}
        </div>
      </div>

      {websiteState === 'draft' && !isReadOnly && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          <span>You have unpublished draft changes.</span>
          <form action={publishDraftActionCustomer.bind(null, businessId)}>
            <input type="hidden" name="previewId" value={latest!.previewId} />
            <button type="submit" className="shrink-0 rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors">
              Publish changes
            </button>
          </form>
        </div>
      )}
    </div>

    {/* Breaks out of the max-w-4xl column above — 95% of whatever width
        <main> actually has (the flex layout in app/app/(dashboard)/layout.tsx
        already excludes the sidebar from that), so the preview reads as the
        real site rather than a small embedded thumbnail. */}
    <div className="w-[95%] mx-auto">
      {/* `key` forces a remount (and therefore a fresh iframe fetch) exactly
          when the underlying business/preview data actually changed — same
          staleness fix already proven in the onboarding wizard's
          `WebsitePreviewPanel` (implementation.md, Stage 19.A). Without it,
          a save that redirects back to this exact route can leave the
          iframe's `src` string unchanged, and React reuses the existing DOM
          node instead of issuing a fresh request — silently stale preview. */}
      <WebsitePreviewCard
        key={`${business.updatedAt}:${latest?.updatedAt ?? ''}`}
        slug={business.slug}
        lastUpdated={latest?.updatedAt}
        hasDraft={hasDraft}
      />
    </div>

    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {checklist.length > 0 && !isReadOnly && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900">Finish setting up your website</h2>
          <div className="mt-1 divide-y divide-gray-100">
            {checklist.map((item) => (
              <ChecklistItem key={item.href + item.label} href={item.href} label={item.label} />
            ))}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
