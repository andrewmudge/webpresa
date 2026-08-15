import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { listDomainConnectionsForBusiness } from '@/lib/db/domain-connections';
import { deriveWebsiteStatus } from '@/lib/customer-editing/site-status';
import { PLAN_CATALOG } from '@/domain/constants/plan-catalog';
import { createBillingPortalSessionAction } from '@/app/account/checkout/actions';
import { Card, Badge, SaveButton } from '../FormBits';
import { resolveSubscriptionBadge, resolveWebsiteOverallStatus, formatDate, formatDateTime } from './status';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ error?: string }>;
}

/**
 * Subscription page (Stage 19, redesigned). Reads plan/status/renewal from
 * `Business` and plan features from `PLAN_CATALOG` — all already-synced
 * data, no live Stripe call at render time. All payment-method, invoice,
 * and cancellation actions remain delegated to the Stripe Customer Portal
 * via `createBillingPortalSessionAction` — this page never re-implements
 * that UI, it only presents context and hands off.
 */
export default async function BillingPage({ params, searchParams }: Props) {
  const { businessId } = await params;
  const { error } = await searchParams;
  const session = await requireCustomerSession();
  const business = await requireBusinessOwnership(session.sub, businessId);
  const { mode, plan: planId } = await requireBusinessAccess(session.sub, businessId);

  if (mode === 'none') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
        <p className="mt-3 text-sm text-gray-600">
          {business.subscriptionStatus === 'canceled'
            ? 'Your subscription has ended. No active subscription was found for this website.'
            : 'No active subscription was found for this website.'}
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

  const plan = planId ? PLAN_CATALOG[planId] : undefined;
  // `billingInterval` is unset on subscriptions that predate this field
  // (webhook reconciliation backfills it on the next event) — 'monthly' is
  // the correct default for that gap, since annual billing didn't exist
  // before it, matching every pre-existing subscription's actual cadence.
  const planPriceDisplay = (business.billingInterval === 'annual' && plan?.annualPriceDisplay) || plan?.priceDisplay;
  const periodEndDisplay = formatDate(business.currentPeriodEnd);
  const subscriptionBadge = resolveSubscriptionBadge(business.subscriptionStatus);
  const isReadOnly = mode === 'billing_recovery';

  const previews = await listPreviewsForBusiness(businessId);
  const { state: websiteState, publishedPreview } = deriveWebsiteStatus(previews);
  const domainConnections = await listDomainConnectionsForBusiness(businessId);
  const domainConnection = domainConnections.find((c) => c.status !== 'disconnected') ?? null;
  const isDomainActive = domainConnection?.status === 'active';
  const publicUrl = isDomainActive ? `https://${domainConnection!.primaryHostname}` : `/b/${business.slug}`;
  const websiteBadge = resolveWebsiteOverallStatus(websiteState, domainConnection?.status);
  const lastPublishedDisplay = formatDateTime(publishedPreview?.updatedAt);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your subscription, payment method, and billing history.</p>
      </div>

      {error === 'portal_unavailable' && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          We couldn&apos;t open the billing portal. Please try again.
        </div>
      )}

      {isReadOnly && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} aria-hidden="true" /> There&apos;s a problem with your last payment. Update your payment method to keep your website active.
          </span>
        </div>
      )}
      {!isReadOnly && business.cancelAtPeriodEnd && business.currentPeriodEnd && (
        <div role="alert" className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Your subscription is scheduled to cancel on {formatDate(business.currentPeriodEnd)}.
        </div>
      )}

      {/* Current plan — bespoke 3-region layout, not the generic `Card`. */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1.3fr_auto]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current plan</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{plan?.label ?? 'None'} Plan</p>
            <div className="mt-2">
              <Badge tone={subscriptionBadge.tone}>
                {subscriptionBadge.tone === 'green' ? (
                  <CheckCircle2 size={12} aria-hidden="true" />
                ) : (
                  <AlertTriangle size={12} aria-hidden="true" />
                )}
                {subscriptionBadge.label}
              </Badge>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {planPriceDisplay ?? '—'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {business.cancelAtPeriodEnd ? 'Ends on ' : 'Renews on '}
              {periodEndDisplay ?? '—'}
            </p>

            <form action={createBillingPortalSessionAction.bind(null, businessId)} className="mt-5">
              <SaveButton
                label="Manage Payment & Subscription"
                pendingLabel="Opening Stripe…"
                icon={<ExternalLink size={16} className="shrink-0" aria-hidden="true" />}
                fullWidthOnMobile
              />
            </form>
            <p className="mt-2 text-xs text-gray-500">Billing is securely managed by Stripe</p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-900">Included in your plan</h2>
            {plan?.featuresIntro && <p className="mt-1 text-xs text-gray-500">{plan.featuresIntro}</p>}
            <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {(plan?.features ?? []).map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden lg:flex items-center justify-center">
            <div className="w-40 h-40 rounded-2xl bg-(--color-brand-muted) flex flex-col items-center justify-center gap-3">
              <div className="flex gap-1" aria-hidden="true">
                <span className="w-1.5 h-1.5 rounded-full bg-(--color-brand)/40" />
                <span className="w-1.5 h-1.5 rounded-full bg-(--color-brand)/40" />
                <span className="w-1.5 h-1.5 rounded-full bg-(--color-brand)/40" />
              </div>
              <ShieldCheck size={56} className="text-(--color-brand)" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Website Status">
          <dl className="text-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-gray-500">Domain</dt>
              <dd className="text-gray-900 font-medium truncate">{isDomainActive ? domainConnection!.primaryHostname : 'Not connected'}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-gray-500">Status</dt>
              <dd>
                <Badge tone={websiteBadge.tone}>
                  {websiteBadge.tone === 'green' ? (
                    <CheckCircle2 size={12} aria-hidden="true" />
                  ) : (
                    <AlertTriangle size={12} aria-hidden="true" />
                  )}
                  {websiteBadge.label}
                </Badge>
              </dd>
            </div>
            {lastPublishedDisplay && (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-gray-500">Last published</dt>
                <dd className="text-gray-900 font-medium">{lastPublishedDisplay}</dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <dt className="text-gray-500 shrink-0">Website URL</dt>
              <dd className="min-w-0">
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--color-brand) font-medium hover:underline truncate block"
                >
                  {isDomainActive ? domainConnection!.primaryHostname : publicUrl}
                </a>
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
            >
              Visit Website <ExternalLink size={14} aria-hidden="true" />
            </a>
            {!isReadOnly && (
              <Link
                href={`/app/businesses/${businessId}/website`}
                className="rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
              >
                Edit Website
              </Link>
            )}
          </div>
        </Card>

        <Card title="Payment & Billing">
          <dl className="text-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-gray-500">Next payment</dt>
              <dd className="text-gray-900 font-medium">{business.cancelAtPeriodEnd ? '—' : periodEndDisplay ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-gray-500">Amount</dt>
              <dd className="text-gray-900 font-medium">{planPriceDisplay ?? '—'}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-gray-500">
            Payment methods, receipts, and billing details are managed securely in Stripe.
          </p>
          <form action={createBillingPortalSessionAction.bind(null, businessId)} className="mt-4">
            <SaveButton label="Manage Payment Methods" pendingLabel="Opening Stripe…" variant="secondary" fullWidthOnMobile />
          </form>
        </Card>
      </div>

      <Card title="Billing history">
        <p className="text-sm text-gray-600">Your invoices and receipts are available in the Stripe billing portal.</p>
        <form action={createBillingPortalSessionAction.bind(null, businessId)} className="mt-4">
          <SaveButton
            label="View invoices in Stripe"
            pendingLabel="Opening Stripe…"
            icon={<ExternalLink size={16} className="shrink-0" aria-hidden="true" />}
            variant="secondary"
            fullWidthOnMobile
          />
        </form>
      </Card>
    </div>
  );
}
