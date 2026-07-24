'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const RESULT_BANNER_COPY: Record<string, { tone: 'success' | 'warning' | 'error'; text: string }> = {
  queued: { tone: 'success', text: 'Screenshot capture started.' },
  conflict: { tone: 'warning', text: 'A capture for this target is already queued or running.' },
  not_eligible: { tone: 'warning', text: 'This target is not eligible for capture right now.' },
  failed: { tone: 'error', text: 'Failed to start the screenshot capture.' },
  marked_failed: { tone: 'success', text: 'Scan marked as failed. You can start a fresh capture now.' },
};

/**
 * Self-dismissing flash banner for the `?screenshotResult=` redirect param
 * `screenshot-actions.ts` sets. Only ever describes the *start* of a capture
 * ("started", "already running", etc.) — never its outcome, since these
 * actions redirect immediately without waiting on the Lambda (see
 * `lib/screenshots/capture.ts`). Left alone, the banner and the URL param
 * both persist indefinitely; auto-dismissing after a few seconds, and
 * stripping the param from the URL so a manual reload doesn't resurrect it,
 * keeps it from reading as a stuck/stale status once the capture finishes.
 */
export function ScreenshotResultBanner({ result }: { result: string }) {
  const [visible, setVisible] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const id = setTimeout(() => {
      setVisible(false);
      const params = new URLSearchParams(window.location.search);
      params.delete('screenshotResult');
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
