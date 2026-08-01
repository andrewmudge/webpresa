import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { PartyPopper, Sparkles, ShieldCheck, Lock, Cloud, Pencil, Store, CheckCircle2, HelpCircle } from 'lucide-react';
import { requireCustomerSession, requireBusinessOwnership } from '@/lib/auth/customer-authorization';
import { getLatestPreviewScreenshots } from '@/lib/screenshots/latest-preview-screenshot';
import { PLAN_CATALOG } from '@/domain/constants/plan-catalog';
import { WebsiteHeroPreview } from '@/app/account/_components/WebsiteHeroPreview';
import { TrustRow } from '@/app/account/_components/TrustRow';
import type { Business } from '@/domain/models/business';
import { AutoRefresh } from './AutoRefresh';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ business?: string }>;
}

const STATUS_TRUST_ITEMS = [
  { icon: ShieldCheck, title: 'Website Activated', subtitle: 'Your site is live on our secure cloud hosting.' },
  { icon: Lock, title: 'SSL Installed', subtitle: 'Your website is secured with SSL encryption.' },
  { icon: Cloud, title: 'Hosting Active', subtitle: 'Fast, reliable hosting is active on your account.' },
  { icon: Pencil, title: 'Dashboard Unlocked', subtitle: 'You now have full access to edit and manage your site.' },
];

const NEXT_STEPS = [
  { title: 'Review & customize', subtitle: 'Edit your content, images, and details to make it your own.' },
  { title: 'Connect your domain', subtitle: 'Use your existing domain or purchase a new one.' },
  { title: 'Publish your website', subtitle: 'Go live with your domain and start getting new customers.' },
];

/**
 * Shared shell (logo + gradient) for all three states of this page — the
 * rich "just paid" celebration below is only for the `active` branch, but
 * the header/background stay consistent everywhere so a customer doesn't
 * see a jarring style change across a refresh while `AutoRefresh` polls.
 */
function PageShell({ dashboardHref, children }: { dashboardHref?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-(--color-page-gradient-start) to-(--color-page-gradient-end)">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2">
          <Image src="/webpresa_w.png" alt="Webpresa" width={692} height={394} className="h-7 w-auto" />
          <span className="text-base font-bold tracking-tight text-gray-900">Webpresa</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="mailto:hello@webpresa.com"
            className="hidden items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors sm:flex"
          >
            <HelpCircle size={15} />
            Need help?
          </a>
          {dashboardHref && (
            <Link
              href={dashboardHref}
              className="rounded-lg border border-(--color-border) bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              Go to Dashboard
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">{children}</main>
    </div>
  );
}

function SimpleCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto mt-12 w-full max-w-md rounded-2xl border border-(--color-border) bg-white p-6 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="mt-2">{children}</div>
    </div>
  );
}

async function ActivatedCelebration({ business }: { business: Business }) {
  const { desktopSrc, mobileSrc } = await getLatestPreviewScreenshots(business.businessId);
  const planEntry = business.plan ? PLAN_CATALOG[business.plan] : undefined;
  const dashboardHref = `/app/businesses/${business.businessId}`;

  return (
    <>
      <div className="rounded-3xl border border-(--color-border) bg-white p-6 shadow-sm sm:p-10">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-(--color-brand-muted) text-2xl">
              <PartyPopper size={22} className="text-(--color-brand)" />
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">Welcome to Webpresa!</h1>
            <p className="mt-2 text-lg font-semibold text-(--color-brand)">Your website is now live and ready.</p>
            <p className="mt-3 max-w-md text-base text-gray-600">
              Thank you for your trust. Your website has been activated and your dashboard is ready for you.
            </p>

            <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-(--color-border) bg-white px-4 py-3 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-brand-muted) text-(--color-brand)">
                <Store size={18} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-gray-900">{business.name}</span>
                {planEntry && (
                  <span className="block text-xs text-gray-500">
                    Plan: {planEntry.label} &bull; {planEntry.priceDisplay}
                  </span>
                )}
                <span className="block text-xs text-gray-500">Billing cycle: Monthly</span>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  <CheckCircle2 size={12} />
                  Active
                </span>
              </span>
            </div>
          </div>

          <WebsiteHeroPreview slug={business.slug} desktopSrc={desktopSrc} mobileSrc={mobileSrc} />
        </div>

        <div className="mt-10 border-t border-(--color-border) pt-8">
          <TrustRow items={STATUS_TRUST_ITEMS} columns={4} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-(--color-border) bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900">What&apos;s next?</h2>
          <p className="mt-1 text-xs text-gray-500">You&apos;re just a few steps away from getting found online.</p>
          <ol className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {NEXT_STEPS.map((step, i) => (
              <li key={step.title} className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--color-brand-muted) text-xs font-semibold text-(--color-brand)">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-sm font-medium text-gray-900">{step.title}</span>
                  <span className="block text-xs text-gray-500">{step.subtitle}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-(--color-border) bg-(--color-brand-muted) p-6 text-center">
          <Sparkles size={20} className="text-(--color-brand)" />
          <h2 className="mt-2 text-sm font-semibold text-gray-900">You&apos;re all set!</h2>
          <p className="mt-1 text-xs text-gray-600">Your website is ready to grow your business.</p>
          <Link
            href={dashboardHref}
            className="mt-4 w-full rounded-lg bg-(--color-brand) px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-colors hover:bg-(--color-brand-dark)"
          >
            Finish Setup
          </Link>
          <p className="mt-2 text-xs text-gray-500">Start editing, connect your domain, and publish.</p>
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-gray-500">
        Questions? We&apos;re here to help you succeed.{' '}
        <a href="mailto:hello@webpresa.com" className="font-medium text-(--color-brand) hover:underline">
          Contact support
        </a>
      </p>
    </>
  );
}

/**
 * Checkout success return page (Stage 18). Never activates anything —
 * `?business=` is read for display/lookup only. Entitlement is granted
 * exclusively by the verified webhook handler; this page just re-reads
 * `business.subscriptionStatus` from DynamoDB and polls (bounded) until it
 * flips to `active`, or shows a "still processing" message after the
 * timeout — never a false failure state. See implementation.md, Stage 18,
 * "Checkout success behavior".
 *
 * Redesigned 2026-07-31 to match the activation page's premium styling for
 * the `active` case — a genuine celebration moment, not a generic status
 * card. The `processing`/no-`businessId` states keep their exact prior
 * behavior (bounded polling, ownership-scoped 404) inside the same
 * shell/header for visual consistency across a refresh.
 */
export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const { business: businessId } = await searchParams;
  const session = await requireCustomerSession();

  if (!businessId) {
    return (
      <PageShell dashboardHref="/account/claim-status">
        <SimpleCard title="Payment received">
          <p className="text-sm text-gray-600">
            Head back to your <Link href="/account/claim-status" className="underline">account</Link> to see your website status.
          </p>
        </SimpleCard>
      </PageShell>
    );
  }

  // 404s if this businessId doesn't belong to the signed-in customer — a
  // Checkout Session URL guessed for another business/customer never
  // discloses anything here.
  const business = await requireBusinessOwnership(session.sub, businessId);

  if (business.subscriptionStatus === 'active') {
    return (
      <PageShell dashboardHref={`/app/businesses/${business.businessId}`}>
        <ActivatedCelebration business={business} />
      </PageShell>
    );
  }

  return (
    <PageShell dashboardHref="/account/claim-status">
      <SimpleCard title="Payment processing">
        <AutoRefresh />
        <p className="text-sm text-gray-600">
          We&apos;re confirming your payment with Stripe — this usually takes just a few seconds. This page will update
          automatically.
        </p>
        <Link href="/account/claim-status" className="mt-4 inline-block text-sm underline text-gray-500">
          Check status later
        </Link>
      </SimpleCard>
    </PageShell>
  );
}
