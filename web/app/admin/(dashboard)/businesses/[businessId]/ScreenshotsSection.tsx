import type { Business } from '@/domain/models/business';
import type { ScanEvent, ScanFailureCategory, ViewportCaptureResult } from '@/domain/models/scan-event';
import { isStaleScan } from '@/lib/screenshots/capture';
import { viewRawArtifactAction } from '../../scans/[scanId]/actions';
import { captureExistingSiteAction, captureGeneratedPreviewAction, markStaleScanFailedAction } from './screenshot-actions';

/**
 * Stage 14 (Playwright Screenshots) admin card. Mirrors `EnrichmentSection`'s
 * shape (plain server component, redirect + query-param result banner — see
 * `screenshot-actions.ts`) but renders two independent targets side by side,
 * since a business has two separate, independently-triggerable captures
 * (see `implementation.md`, Stage 14, "Screenshot targets").
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

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Screenshots</h3>

      {resultQuery && <ResultBanner result={resultQuery} />}

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
            <ViewportLinks scanId={latestScan.scanId} results={latestScan.captureResults} />
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

function ViewportLinks({
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
    <div className="flex items-center gap-3">
      {entries.map(([viewport, result]) =>
        result?.status === 'completed' && result.storageKey ? (
          <form key={viewport} action={viewRawArtifactAction.bind(null, result.storageKey)}>
            <button type="submit" className="text-(--color-brand) hover:underline text-sm capitalize">
              {viewport} ↗
            </button>
          </form>
        ) : (
          <span key={viewport} className="text-xs text-gray-300 capitalize">
            {viewport}: {result?.status === 'failed' ? failureLabel(result.failureCategory ?? 'unknown') : 'unavailable'}
          </span>
        ),
      )}
      <span className="text-[10px] text-gray-300">· scan {scanId.slice(-8)}</span>
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

const RESULT_BANNER_COPY: Record<string, { tone: 'success' | 'warning' | 'error'; text: string }> = {
  queued: { tone: 'success', text: 'Screenshot capture started.' },
  conflict: { tone: 'warning', text: 'A capture for this target is already queued or running.' },
  not_eligible: { tone: 'warning', text: 'This target is not eligible for capture right now.' },
  failed: { tone: 'error', text: 'Failed to start the screenshot capture.' },
  marked_failed: { tone: 'success', text: 'Scan marked as failed. You can start a fresh capture now.' },
};

function ResultBanner({ result }: { result: string }) {
  const copy = RESULT_BANNER_COPY[result];
  if (!copy) return null;
  const toneClass =
    copy.tone === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : copy.tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-red-200 bg-red-50 text-red-800';
  return <div className={`rounded-lg border px-4 py-3 text-sm ${toneClass}`}>{copy.text}</div>;
}
