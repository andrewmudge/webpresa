import Link from 'next/link';
import Image from 'next/image';
import { LogOut, CheckSquare, Clock, Pencil } from 'lucide-react';
import { requireCustomerSession } from '@/lib/auth/customer-authorization';
import { getBusinessesByOwnerUserId } from '@/lib/db/businesses';
import { customerSignOutAction } from '@/lib/auth/customer-actions';
import { createBillingPortalSessionAction } from '@/app/account/checkout/actions';
import { getLatestPreviewScreenshots } from '@/lib/screenshots/latest-preview-screenshot';
import { ActivationHero } from './ActivationHero';
import { WebsiteHeroPreview } from '../_components/WebsiteHeroPreview';
import { PlanSelectionForm } from './PlanSelectionForm';
import { TrustRow } from '../_components/TrustRow';
import type { Business } from '@/domain/models/business';

export const dynamic = 'force-dynamic';

const PLAN_LABELS = { basic: 'Basic', growth: 'Growth' } as const;

const VALUE_TRUST_ITEMS = [
  { icon: CheckSquare, title: 'Your website is already built', subtitle: "We've done the heavy lifting for you." },
  { icon: Clock, title: 'Go live in minutes', subtitle: 'Instant access after checkout.' },
  { icon: Pencil, title: 'Edit anytime', subtitle: 'Make changes whenever you need.' },
];

/** `active`/`past_due` — unchanged behavior from before this redesign, just restyled to match the new shell. */
function SubscribedBusinessCard({ business }: { business: Business }) {
  const { subscriptionStatus, plan, cancelAtPeriodEnd, currentPeriodEnd } = business;
  const renewsOrEndsOn = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="rounded-2xl border border-(--color-border) bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-gray-900">You&apos;ve claimed {business.name}</h1>

      {subscriptionStatus === 'active' && (
        <>
          <p className="mt-2 text-sm text-gray-600">
            {plan ? PLAN_LABELS[plan] : 'Your'} plan is active.
            {cancelAtPeriodEnd && renewsOrEndsOn ? ` Your plan ends on ${renewsOrEndsOn}.` : renewsOrEndsOn ? ` Renews on ${renewsOrEndsOn}.` : ''}
          </p>
          {/* Stage 19 — the real dashboard now lives at /app; claim-status
              keeps its own "Manage billing" as a secondary action rather than
              growing a second billing UI (see implementation.md, Stage 19,
              "Small required changes to already-shipped code"). */}
          <Link
            href={`/app/businesses/${business.businessId}`}
            className="mt-4 block w-full text-center rounded-lg bg-(--color-brand) text-white py-2.5 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
          >
            Go to dashboard
          </Link>
          <form action={createBillingPortalSessionAction.bind(null, business.businessId)} className="mt-2">
            <button
              type="submit"
              className="w-full rounded-lg border border-(--color-border) text-gray-700 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Manage billing
            </button>
          </form>
        </>
      )}

      {subscriptionStatus === 'past_due' && (
        <>
          <div role="alert" className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            There was a problem with your last payment. Update your payment method to keep your website active.
          </div>
          <Link
            href={`/app/businesses/${business.businessId}`}
            className="mt-4 block w-full text-center rounded-lg bg-(--color-brand) text-white py-2.5 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
          >
            Go to dashboard
          </Link>
          <form action={createBillingPortalSessionAction.bind(null, business.businessId)} className="mt-2">
            <button
              type="submit"
              className="w-full rounded-lg border border-(--color-border) text-gray-700 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Update payment method
            </button>
          </form>
        </>
      )}
    </div>
  );
}

/**
 * `undefined` (never subscribed) or `canceled` — the activation/reactivation
 * moment this redesign (2026-07-31) targets: a celebratory hero with the
 * business's own already-built site as the centerpiece, followed by the
 * plan-activation form. Same underlying data/actions as before; only
 * presentation and component structure changed (see `build_log.md`).
 */
async function ActivationCard({ business }: { business: Business }) {
  const { desktopSrc, mobileSrc } = await getLatestPreviewScreenshots(business.businessId);

  return (
    <div className="rounded-3xl border border-(--color-border) bg-white p-6 shadow-sm sm:p-10">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <ActivationHero
          businessName={business.name}
          claimedAt={business.claimedAt}
          justClaimed={business.subscriptionStatus !== 'canceled'}
        />
        <WebsiteHeroPreview slug={business.slug} desktopSrc={desktopSrc} mobileSrc={mobileSrc} />
      </div>

      <div className="mt-10 border-t border-(--color-border) pt-10">
        <PlanSelectionForm businessId={business.businessId} />
      </div>
    </div>
  );
}

/**
 * Business-scoped (a customer may own more than one business — see
 * implementation.md, Stage 17, "Ownership model"), resolved via
 * `owner-user-id-index` rather than assuming a single owned business.
 *
 * Stage 17 shipped this as an informational-only "activate (coming soon)"
 * placeholder; Stage 18 replaced it with a real plan selector, live
 * subscription status, and a Customer Portal link. Redesigned 2026-07-31
 * into a premium activation experience for the no-active-subscription case
 * (implementation.md, "Onboarding UI polish").
 */
export default async function ClaimStatusPage() {
  const session = await requireCustomerSession();
  const businesses = await getBusinessesByOwnerUserId(session.sub);

  if (businesses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-(--color-brand-muted) via-(--color-brand-muted)/40 to-white px-4">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-700">Your account isn&apos;t currently associated with a claimed business.</p>
          <form action={customerSignOutAction}>
            <button type="submit" className="text-sm underline text-gray-500 hover:text-gray-700">
              Sign out
            </button>
          </form>
        </div>
      </div>
    );
  }

  const hasUnactivatedBusiness = businesses.some(
    (b) => b.subscriptionStatus !== 'active' && b.subscriptionStatus !== 'past_due',
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-(--color-brand-muted) via-(--color-brand-muted)/40 to-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2">
          <Image src="/webpresa_w.png" alt="Webpresa" width={692} height={394} className="h-7 w-auto" />
          <span className="text-base font-bold tracking-tight text-gray-900">Webpresa</span>
        </div>
        <form action={customerSignOutAction}>
          <button
            type="submit"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </form>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="space-y-6">
          {businesses.map((business) =>
            business.subscriptionStatus === 'active' || business.subscriptionStatus === 'past_due' ? (
              <SubscribedBusinessCard key={business.businessId} business={business} />
            ) : (
              <ActivationCard key={business.businessId} business={business} />
            ),
          )}
        </div>

        {hasUnactivatedBusiness && (
          <div className="mt-12 border-t border-(--color-border) pt-8">
            <TrustRow items={VALUE_TRUST_ITEMS} />
          </div>
        )}
      </main>
    </div>
  );
}
