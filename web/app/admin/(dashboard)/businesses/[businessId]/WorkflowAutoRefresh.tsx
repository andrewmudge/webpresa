'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Polls for fresh scan-execution status while a Stage 16 workflow is in
 * flight. Mirrors `ScreenshotAutoRefresh.tsx` exactly — this section's data
 * comes from a Server Component render, and the Step Functions execution
 * updates DynamoDB directly (via the internal API routes) with no
 * client-visible push, so without this the admin would need to reload the
 * page manually to see progress.
 */
export function WorkflowAutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [active, router]);

  return null;
}
