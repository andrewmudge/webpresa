'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, AlertTriangle } from 'lucide-react';

interface StatusResponse {
  outcome: 'in_progress' | 'ready' | 'failed';
  label?: string;
  position?: number;
  totalSteps?: number;
  hasExistingWebsite?: boolean;
  slug?: string;
  message?: string;
}

const POLL_INTERVAL_MS = 2500;
const GENERIC_FAILURE_MESSAGE = 'We couldn’t finish building your website. Please try again.';

/**
 * Real backend step transitions (`ScanWorkflowStep`) are too coarse and too
 * infrequent to poll well on their own — a fast build can sit on one real
 * step for the better part of a minute, which reads as a frozen page even
 * though nothing is wrong. So the displayed copy is driven by a client-side
 * timer that always moves forward every `COSMETIC_TICK_MS`, independent of
 * how often the real step actually changes — deliberately a little ahead of
 * literal backend truth, in exchange for a progress view that never looks
 * stuck. It's never allowed to fall *behind* confirmed real progress
 * though: every poll response snaps the cosmetic index up to at least the
 * real stage's own starting point (see the `floorIndex` logic below), so
 * genuine backend progress is never contradicted, only ever gotten ahead of
 * cosmetically. A real terminal outcome (`ready`/`failed`) always still
 * comes from the server, never faked.
 */
const COSMETIC_TICK_MS = 8000;

const HAS_WEBSITE_MESSAGES = [
  'Business information received',
  'Getting everything organized…',
  'Analyzing your current website…',
  'Comparing it to similar businesses…',
  'Reviewing your services…',
  'Mapping out your site structure…',
  'Writing your website copy…',
  'Polishing the wording…',
  'Designing your site…',
  'Choosing colors and layout…',
  'Publishing your website…',
  'Putting on the finishing touches…',
] as const;

const NO_WEBSITE_MESSAGES = [
  'Business information received',
  'Getting everything organized…',
  'Reviewing your services…',
  'Mapping out your site structure…',
  'Writing your website copy…',
  'Polishing the wording…',
  'Designing your site…',
  'Choosing colors and layout…',
  'Preparing your photos…',
  'Placing them on your site…',
  'Publishing your website…',
  'Putting on the finishing touches…',
] as const;

/** Each real backend stage (`resolveProgressLabel`'s 1-based `position`) maps to this many cosmetic sub-messages, in order — both message lists above are sized to match. */
const COSMETIC_STEPS_PER_REAL_STAGE = 2;

export function BuildProgress({ buildId }: { buildId: string }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<'in_progress' | 'ready' | 'failed'>('in_progress');
  const [failureMessage, setFailureMessage] = useState<string>(GENERIC_FAILURE_MESSAGE);
  const [hasExistingWebsite, setHasExistingWebsite] = useState(false);
  const [cosmeticIndex, setCosmeticIndex] = useState(0);

  const messages = hasExistingWebsite ? HAS_WEBSITE_MESSAGES : NO_WEBSITE_MESSAGES;

  // A ref (not state) so the async poll loop always sees the latest
  // "should I keep going" decision without re-subscribing the effect.
  const keepPollingRef = useRef(true);

  useEffect(() => {
    keepPollingRef.current = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (!keepPollingRef.current) return;

      try {
        const res = await fetch(`/api/build/${buildId}/status`, { cache: 'no-store' });

        if (res.status === 404) {
          keepPollingRef.current = false;
          setOutcome('failed');
          setFailureMessage(GENERIC_FAILURE_MESSAGE);
          return;
        }

        const data: StatusResponse = await res.json();

        if (data.outcome === 'ready' && data.slug) {
          keepPollingRef.current = false;
          setOutcome('ready');
          router.push(`/b/${data.slug}`);
          return;
        }

        if (data.outcome === 'failed') {
          keepPollingRef.current = false;
          setOutcome('failed');
          setFailureMessage(data.message ?? GENERIC_FAILURE_MESSAGE);
          return;
        }

        if (typeof data.hasExistingWebsite === 'boolean') setHasExistingWebsite(data.hasExistingWebsite);
        if (data.position) {
          const floorIndex = (data.position - 1) * COSMETIC_STEPS_PER_REAL_STAGE;
          setCosmeticIndex((i) => Math.max(i, floorIndex));
        }
      } catch {
        // Transient network error — keep polling rather than surfacing a
        // false failure; a genuine terminal failure comes from the server,
        // never inferred client-side from one dropped request.
      }

      timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();
    return () => {
      keepPollingRef.current = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [buildId, router]);

  // The cosmetic advancement timer — separate from the real poll above, and
  // stopped as soon as a real terminal outcome lands.
  useEffect(() => {
    if (outcome !== 'in_progress') return;
    const id = setInterval(() => {
      setCosmeticIndex((i) => Math.min(i + 1, HAS_WEBSITE_MESSAGES.length - 1));
    }, COSMETIC_TICK_MS);
    return () => clearInterval(id);
  }, [outcome]);

  const label = messages[Math.min(cosmeticIndex, messages.length - 1)];
  const progressPercent = ((cosmeticIndex + 1) / messages.length) * 100;

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <header className="border-b border-gray-100 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-lg">
          <Image
            src="/webpresa_logo_horizontal_cropped_nobg.png"
            alt="Webpresa"
            width={1460}
            height={238}
            className="h-6 w-auto sm:h-7"
            priority
          />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg text-center">
          {outcome === 'failed' ? (
            <div className="rounded-2xl border border-red-100 bg-white p-8 shadow-sm">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">We hit a snag.</h1>
              <p className="mt-2 text-sm text-gray-500">{failureMessage}</p>
              <Link
                href="/build"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-(--color-brand) px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-(--color-brand-dark) transition-colors"
              >
                Try again
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
              <motion.div
                className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-(--color-brand-muted)"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 size={26} className="text-(--color-brand)" />
              </motion.div>

              <h1 className="text-2xl font-bold text-gray-900">We&apos;re building your website.</h1>
              <p className="mt-2 text-sm text-gray-500">
                Keep this page open. We&apos;ll take you there automatically when it&apos;s ready.
              </p>

              <div className="mt-8">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <motion.div
                    className="h-full rounded-full bg-(--color-brand)"
                    initial={false}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
                <p className="mt-3 text-sm font-medium text-gray-700" aria-live="polite">
                  {label}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
