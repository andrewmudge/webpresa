'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_INTERVAL_MS = 3000;
const MAX_REFRESHES = 20; // ~1 minute bounded polling — avoids an infinite spinner

/**
 * Bounded client-side polling for the "payment processing" state — refreshes
 * the Server Component (re-reading `business.subscriptionStatus` from
 * DynamoDB) every few seconds until the webhook lands or a timeout is
 * reached. Renders nothing itself; the page's own server-rendered copy is
 * what changes across refreshes.
 */
export function AutoRefresh() {
  const router = useRouter();
  const attempts = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      attempts.current += 1;
      if (attempts.current > MAX_REFRESHES) {
        clearInterval(interval);
        return;
      }
      router.refresh();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [router]);

  return null;
}
