'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const RESULT_BANNER_COPY: Record<string, { tone: 'success' | 'warning' | 'error'; text: string }> = {
  started: { tone: 'success', text: 'Scan workflow started.' },
  conflict: { tone: 'warning', text: 'A scan workflow for this business is already queued or running.' },
  failed: { tone: 'error', text: 'Failed to start the scan workflow.' },
};

/**
 * Self-dismissing flash banner for the `?workflowResult=` redirect param
 * `workflow-actions.ts` sets — mirrors `ScreenshotResultBanner.tsx`. Only
 * ever describes whether the *execution started*, never its eventual
 * outcome, since the action redirects immediately without waiting on the
 * Step Functions execution (see `lib/workflow/run-scan-workflow.ts`).
 */
export function WorkflowResultBanner({ result }: { result: string }) {
  const [visible, setVisible] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const id = setTimeout(() => {
      setVisible(false);
      const params = new URLSearchParams(window.location.search);
      params.delete('workflowResult');
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 5000);
    return () => clearTimeout(id);
  }, [pathname, router]);

  const copy = RESULT_BANNER_COPY[result];
  if (!copy || !visible) return null;

  const toneClass =
    copy.tone === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : copy.tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-red-200 bg-red-50 text-red-800';
  return <div className={`rounded-lg border px-4 py-3 text-sm ${toneClass}`}>{copy.text}</div>;
}
