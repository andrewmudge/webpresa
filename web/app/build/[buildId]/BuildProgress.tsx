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
  slug?: string;
  message?: string;
}

const POLL_INTERVAL_MS = 2500;
const INITIAL_STATUS: StatusResponse = {
  outcome: 'in_progress',
  label: 'Business information received',
  position: 1,
  totalSteps: 6,
};
const GENERIC_FAILURE_MESSAGE = 'We couldn’t finish building your website. Please try again.';

export function BuildProgress({ buildId }: { buildId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusResponse>(INITIAL_STATUS);

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
          setStatus({ outcome: 'failed', message: GENERIC_FAILURE_MESSAGE });
          return;
        }

        const data: StatusResponse = await res.json();
        setStatus(data);

        if (data.outcome === 'ready' && data.slug) {
          keepPollingRef.current = false;
          router.push(`/b/${data.slug}`);
          return;
        }

        if (data.outcome === 'failed') {
          keepPollingRef.current = false;
          return;
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

  const progressPercent = status.position && status.totalSteps ? (status.position / status.totalSteps) * 100 : 10;

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
          {status.outcome === 'failed' ? (
            <div className="rounded-2xl border border-red-100 bg-white p-8 shadow-sm">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">We hit a snag.</h1>
              <p className="mt-2 text-sm text-gray-500">{status.message ?? GENERIC_FAILURE_MESSAGE}</p>
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
                  {status.label ?? INITIAL_STATUS.label}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
