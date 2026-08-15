import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import {
  PartyPopper,
  ShieldCheck,
  Lock,
  Cloud,
  Pencil,
  Store,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  FilePenLine,
  Globe,
  Rocket,
  MessageCircle,
} from 'lucide-react';
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

/** `href` is a function of `businessId` — built once per render in `ActivatedCelebration`, not here. */
const NEXT_STEPS = [
  {
    title: 'Review & customize',
    subtitle: 'Edit your content, images, and details to make it truly yours.',
    icon: FilePenLine,
    iconBgClass: 'bg-blue-50',
    iconColorClass: 'text-blue-600',
    linkLabel: 'Go to Editor',
    buildHref: (businessId: string) => `/app/businesses/${businessId}/website`,
  },
  {
    title: 'Connect your domain',
    subtitle: 'Use your existing domain or purchase a new one that fits your brand.',
    icon: Globe,
    iconBgClass: 'bg-green-50',
    iconColorClass: 'text-green-600',
    linkLabel: 'Manage domain',
    buildHref: (businessId: string) => `/app/onboarding/${businessId}/domain`,
  },
  {
    title: 'Publish your website',
    subtitle: 'Go live with your domain and start getting new customers.',
    icon: Rocket,
    iconBgClass: 'bg-purple-50',
    iconColorClass: 'text-purple-600',
    linkLabel: 'Publish site',
    // No dedicated "publish" page for an already-active business — the
    // Publish button lives on the website editor itself (conditionally
    // rendered when there's a draft to publish), so this points there too.
    buildHref: (businessId: string) => `/app/businesses/${businessId}/website`,
  },
];

/**
 * Shared shell (logo + gradient) for all three states of this page — the
 * rich "just paid" celebration below is only for the `active` branch, but
 * the header/background stay consistent everywhere so a customer doesn't
 * see a jarring style change across a refresh while `AutoRefresh` polls.
 */
function PageShell({ dashboardHref, children }: { dashboardHref?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen page-ambient-bg">
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
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-(--color-brand-muted) text-2xl">
                <PartyPopper size={22} className="text-(--color-brand)" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                <CheckCircle2 size={12} />
                Activation complete
              </span>
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
              Your website is live! 🎉
            </h1>
            <p className="mt-2 max-w-md text-base text-gray-600">
              Everything is set up and your site is ready to grow your business online.
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
      </div>

      <div className="mt-8 flex flex-col items-center text-center">
        <Link
          href={dashboardHref}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0D3AD9] px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          Finish Setup
          <ArrowRight size={16} />
        </Link>
        <p className="mt-2 text-xs text-gray-500">Start editing, connect your domain, and publish your site.</p>
      </div>

      <div className="mt-8 rounded-2xl border border-(--color-border) bg-white p-6">
        <TrustRow items={STATUS_TRUST_ITEMS} columns={4} />
      </div>

      <div className="mt-6 rounded-2xl border border-(--color-border) bg-white p-6 sm:p-8">
        <h2 className="text-base font-semibold text-gray-900">What&apos;s next?</h2>
        <p className="mt-1 text-sm text-gray-500">Just a few simple steps to get found online.</p>

        <div className="mt-6 grid grid-cols-1 divide-y divide-(--color-border) sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {NEXT_STEPS.map((step, i) => (
            <div key={step.title} className="flex flex-col items-center px-4 py-6 text-center first:pt-0 sm:py-0">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--color-brand-muted) text-xs font-semibold text-(--color-brand)">
                {i + 1}
              </span>
              <span className={`mt-3 flex h-12 w-12 items-center justify-center rounded-xl ${step.iconBgClass} ${step.iconColorClass}`}>
                <step.icon size={22} />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-1.5 max-w-[16rem] text-xs text-gray-500">{step.subtitle}</p>
              <Link
                href={step.buildHref(business.businessId)}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-(--color-brand) hover:underline"
              >
                {step.linkLabel}
                <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-(--color-border) bg-white p-6 sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-brand-muted) text-(--color-brand)">
            <MessageCircle size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-gray-900">Need help getting started?</span>
            <span className="block text-xs text-gray-500">Our team is here for you.</span>
          </span>
        </div>
        <a
          href="mailto:hello@webpresa.com"
          className="rounded-lg border border-(--color-border) bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          Contact Support
        </a>
      </div>
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
