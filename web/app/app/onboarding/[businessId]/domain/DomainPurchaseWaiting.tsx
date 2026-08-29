'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { deferDomainAction } from '../actions';

const POLL_INTERVAL_MS = 7000; // matches DomainStatusPanel's existing cadence

/**
 * Shown on the original Webpresa tab immediately after "Buy a new domain"
 * opens Storefront in a new tab (see `DomainChoiceCards`). Quietly polls via
 * `router.refresh()` — this re-runs `page.tsx`'s server-side data fetch and
 * delivers a fresh `connection` prop into the already-mounted
 * `DomainStepPanel` without remounting it or losing any state, so the
 * moment the webhook creates the `DomainConnection`, the very next refresh
 * flips the page over to `DomainStatusPanel` automatically — no manual
 * refresh, no dead end.
 *
 * The "continue for now" escape hatch reuses `deferDomainAction` (the same
 * action the "Use my Webpresa address for now" card already calls) rather
 * than inventing a new one — it already does exactly the right thing here
 * too: mark the domain step deferred and move the customer forward.
 */
export function DomainPurchaseWaiting({ businessId }: { businessId: string }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="rounded-2xl border border-(--color-border) bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-(--color-brand) animate-pulse" aria-hidden="true" />
        <p className="text-sm text-gray-600">Waiting for your purchase to complete…</p>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Complete your purchase in the new tab we opened (look for &quot;← Return to Webpresa&quot; there once
        you&apos;re done). This page will update automatically once your domain is connected — no need to come
        back and refresh.
      </p>
      <form action={deferDomainAction.bind(null, businessId)} className="mt-4">
        <button type="submit" className="text-sm font-medium text-gray-500 underline">
          Continue — I&apos;ll finish this later
        </button>
      </form>
    </div>
  );
}
