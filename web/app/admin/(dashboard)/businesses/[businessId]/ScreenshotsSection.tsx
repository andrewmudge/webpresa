import type { Business } from '@/domain/models/business';
import type { ScanEvent, ScanFailureCategory, ViewportCaptureResult } from '@/domain/models/scan-event';
import { isStaleScan } from '@/lib/screenshots/capture';
import { captureExistingSiteAction, captureGeneratedPreviewAction, markStaleScanFailedAction } from './screenshot-actions';
import { ScreenshotAutoRefresh } from './ScreenshotAutoRefresh';
import { ScreenshotResultBanner } from './ScreenshotResultBanner';

/**
 * Stage 14 (Playwright Screenshots) admin card. Mirrors `EnrichmentSection`'s
 * shape (plain server component, redirect + query-param result banner — see
 * `screenshot-actions.ts`) but renders two independent targets side by side,
 * since a business has two separate, independently-triggerable captures
 * (see `implementation.md`, Stage 14, "Screenshot targets"). Two small client
 * components handle the two things a pure server render can't: polling for
 * the Lambda's out-of-band result (`ScreenshotAutoRefresh`) and dismissing
 * the transient "started" banner once it's no longer accurate
 * (`ScreenshotResultBanner`).
 */

const PLAYWRIGHT_FAILURE_LABELS: Partial<Record<ScanFailureCategory, string>> = {
  browser_launch_failed: 'Browser failed to start',
  navigation_timeout: 'Page navigation timed out',
  page_load_failed: 'Page failed to load',
  blocked_by_bot_protection: 'Blocked by bot protection',
  screenshot_failed: 'Screenshot capture failed',
  upload_failed: 'Failed to upload screenshot',
  unknown: 'Unknown error',
};

function failureLabel(category: ScanFailureCategory): string {
  return PLAYWRIGHT_FAILURE_LABELS[category] ?? category.replace(/_/g, ' ');
}

interface Props {
  business: Business;
  scans: ScanEvent[];
  resultQuery?: string;
}

export function ScreenshotsSection({ business, scans, resultQuery }: Props) {
  const playwrightScans = scans.filter((s) => s.provider === 'playwright');
  const existingSiteScans = playwrightScans.filter((s) => s.targetType === 'existing_site');
  const previewScans = playwrightScans.filter((s) => s.targetType === 'generated_preview');
  const hasActiveScan = [...existingSiteScans, ...previewScans].some((s) => s.status === 'queued' || s.status === 'running');

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <ScreenshotAutoRefresh active={hasActiveScan} />
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Screenshots</h3>

      {resultQuery && <ScreenshotResultBanner result={resultQuery} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TargetCard
          businessId={business.businessId}
          title="Existing Website"
          scans={existingSiteScans}
          eligible={!!business.websiteUrl?.trim()}
          ineligibleMessage="No existing website available."
          captureAction={captureExistingSiteAction.bind(null, business.businessId)}
        />
        <TargetCard
          businessId={business.businessId}
          title="Generated Preview"
          scans={previewScans}
          eligible
          ineligibleMessage="Generate a website for this business first."
          captureAction={captureGeneratedPreviewAction.bind(null, business.businessId)}
        />
      </div>
    </div>
  );
}

function TargetCard({
  businessId,
  title,
  scans,
  eligible,
  ineligibleMessage,
  captureAction,
}: {
  businessId: string;
  title: string;
  scans: ScanEvent[]; // newest first
  eligible: boolean;
  ineligibleMessage: string;
  captureAction: () => Promise<void>;
}) {
  const latestScan = scans[0];
  const activeScan = scans.find((s) => s.status === 'queued' || s.status === 'running');
  const stale = activeScan && isStaleScan(activeScan);

  return (
    <div className="rounded-lg border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      </div>

      {!eligible ? (
        <p className="text-xs text-gray-400">{ineligibleMessage}</p>
      ) : (
        <>
          <div className="text-sm">
            <div className="text-xs text-gray-400">Latest capture</div>
            <div className="text-gray-900">
              {latestScan ? `${statusLabel(latestScan.status)} — ${new Date(latestScan.createdAt).toLocaleString()}` : 'Never run'}
            </div>
            {latestScan?.status === 'failed' && latestScan.failureCategory && (
              <div className="text-xs text-red-600 mt-0.5">{failureLabel(latestScan.failureCategory)}</div>
            )}
          </div>

          {latestScan && (latestScan.status === 'completed' || latestScan.status === 'partial') && (
            <ViewportThumbnails scanId={latestScan.scanId} results={latestScan.captureResults} />
          )}

          {stale && activeScan && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-1">
              <p>This capture has been {statusLabel(activeScan.status).toLowerCase()} for over 10 minutes with no response.</p>
              <form action={markStaleScanFailedAction.bind(null, businessId, activeScan.scanId)}>
                <button type="submit" className="underline hover:no-underline">
                  Mark as failed
                </button>
              </form>
            </div>
          )}

          <form action={captureAction}>
            <button
              type="submit"
              disabled={!!activeScan && !stale}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {activeScan && !stale ? 'Capturing…' : latestScan ? 'Capture again' : 'Capture'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

// Matches the real capture dimensions (infra/lambda/screenshot-capture/src/
// browser.ts's VIEWPORTS) so a shrunk-down thumbnail keeps the same aspect
// ratio as the full screenshot rather than stretching/cropping it.
const VIEWPORT_ASPECT: Record<'desktop' | 'mobile', string> = {
  desktop: 'aspect-[1440/1000]',
  mobile: 'aspect-[390/844]',
};
const VIEWPORT_WIDTH: Record<'desktop' | 'mobile', string> = {
  desktop: 'w-56',
  mobile: 'w-24',
};

function ViewportThumbnails({
  scanId,
  results,
}: {
  scanId: string;
  results?: ScanEvent['captureResults'];
}) {
  if (!results) return null;
  const entries: Array<['desktop' | 'mobile', ViewportCaptureResult | undefined]> = [
    ['desktop', results.desktop],
    ['mobile', results.mobile],
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex items-end gap-3">
        {entries.map(([viewport, result]) => {
          const sizeClasses = `${VIEWPORT_WIDTH[viewport]} ${VIEWPORT_ASPECT[viewport]}`;
          if (result?.status === 'completed' && result.storageKey) {
            const href = `/admin/scans/view-artifact?key=${encodeURIComponent(result.storageKey)}`;
            return (
              <a
                key={viewport}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open full-size ${viewport} screenshot`}
                className="block group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={href}
                  alt={`${viewport} screenshot`}
                  className={`${sizeClasses} rounded-md border border-gray-200 object-cover group-hover:opacity-75 transition-opacity`}
                />
                <div className="mt-1 text-[10px] text-gray-400 capitalize text-center">{viewport}</div>
              </a>
            );
          }
          return (
            <div key={viewport} className={`${sizeClasses} flex flex-col items-center justify-center`}>
              <div className="w-full h-full rounded-md border border-dashed border-gray-200 flex items-center justify-center px-1">
                <span className="text-[9px] text-gray-300 text-center leading-tight">
                  {result?.status === 'failed' ? failureLabel(result.failureCategory ?? 'unknown') : 'Unavailable'}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-gray-400 capitalize text-center">{viewport}</div>
            </div>
          );
        })}
      </div>
      <span className="text-[10px] text-gray-300">scan {scanId.slice(-8)}</span>
    </div>
  );
}

function statusLabel(status: ScanEvent['status']): string {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'running':
      return 'Running';
    case 'completed':
      return 'Completed';
    case 'partial':
      return 'Partially completed';
    case 'failed':
      return 'Failed';
    case 'manual_approval_required':
      return 'Manual approval required';
  }
}
