'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Polls for fresh scan status while any of this campaign's recipients'
 * businesses has an active Step Functions scan execution — same shape as
 * `WorkflowAutoRefresh.tsx` (business detail page), just driven by "any
 * recipient active" instead of a single business's latest execution.
 */
export function CampaignScanAutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [active, router]);

  return null;
}
