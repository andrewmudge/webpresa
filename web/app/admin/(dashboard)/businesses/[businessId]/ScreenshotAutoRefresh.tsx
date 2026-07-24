'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Polls for fresh scan status while a Stage 14 capture is in-flight. This
 * section's data comes from a Server Component render, so without this the
 * "Capturing…" state and view links never update until the admin manually
 * reloads the page — the Lambda writes its result straight to DynamoDB with
 * no client-visible push. Stops automatically once the parent re-renders
 * with `active: false` (no more queued/running scans).
 */
export function ScreenshotAutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [active, router]);

  return null;
}
