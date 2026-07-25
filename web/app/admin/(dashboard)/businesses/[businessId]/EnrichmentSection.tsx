import Link from 'next/link';
import type { Business, EnrichmentStatus, ManualApprovalReason } from '@/domain/models/business';
import type { ScanEvent, ScanFailureCategory } from '@/domain/models/scan-event';
import type { SitePreview } from '@/domain/models/site-preview';
import { isRetryableFailureCategory } from '@/lib/firecrawl/retry';
import { enrichWebsiteAction, retryEnrichmentAction } from './enrichment-actions';

/**
 * Stage 13 (Firecrawl Website Enrichment) admin card. A plain server
 * component — no client JS needed, since eligibility (active-scan guard,
 * retry eligibility) is fully determined server-side from already-loaded
 * `scans`/`business` data, and both actions redirect back to this page
 * rather than returning inline `useActionState` feedback (see
 * `enrichment-actions.ts`).
 */

const ENRICHMENT_STATUS_LABELS: Record<EnrichmentStatus, string> = {
  not_started: 'Not started',
  ready_for_enrichment: 'Ready for enrichment',
  enrichment_in_progress: 'Enrichment in progress',
  enrichment_completed: 'Enrichment completed',
  enrichment_failed: 'Enrichment failed',
  manual_approval_required: 'Manual approval required',
};

const MANUAL_APPROVAL_REASON_LABELS: Record<ManualApprovalReason, string> = {
  missing_website: 'No website on file',
  no_usable_images: 'No usable images found',
  insufficient_content: 'Insufficient website content',
  other: 'Other',
};

const SCAN_STATUS_LABELS: Record<ScanEvent['status'], string> = {
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  partial: 'Partially completed',
  failed: 'Failed',
  manual_approval_required: 'Manual approval required',
};

// Covers every ScanFailureCategory, including the Stage 14 (Playwright)
// values below — this card only ever displays Firecrawl scans in practice,
// but the type is shared across both providers (see domain/models/
// scan-event.ts), so TypeScript requires every member here regardless.
const FAILURE_CATEGORY_LABELS: Record<ScanFailureCategory, string> = {
  missing_website: 'No website on file',
  invalid_url: 'Invalid website URL',
  blocked_url: 'Website URL not allowed',
  firecrawl_auth: 'Firecrawl authentication error',
  firecrawl_rate_limit: 'Firecrawl rate limit reached',
  firecrawl_timeout: 'Firecrawl request timed out',
  firecrawl_provider_error: 'Firecrawl provider error',
  website_unreachable: 'Website unreachable',
  website_error_response: 'Website returned an error (blocked or unavailable)',
  empty_content: 'No content found on page',
  normalization_failed: 'Could not process page content',
  artifact_storage_failed: 'Failed to save scan data',
  generation_failed: 'Website generation failed',
  preview_persistence_failed: 'Failed to save generated preview',
  browser_launch_failed: 'Browser failed to start',
  navigation_timeout: 'Page navigation timed out',
  page_load_failed: 'Page failed to load',
  blocked_by_bot_protection: 'Blocked by bot protection',
  screenshot_failed: 'Screenshot capture failed',
  upload_failed: 'Failed to upload screenshot',
  invalid_ai_schema_output: 'AI returned invalid output',
  ai_request_failed: 'AI scoring request failed',
  ai_timeout: 'AI scoring request timed out',
  unknown: 'Unknown error',
};

function resolveDisplayStatus(business: Business): EnrichmentStatus {
  if (business.enrichmentStatus) return business.enrichmentStatus;
  return business.websiteUrl?.trim() ? 'ready_for_enrichment' : 'not_started';
}

interface Props {
  business: Business;
  scans: ScanEvent[];
  previews: SitePreview[];
  resultQuery?: string;
}

export function EnrichmentSection({ business, scans, previews, resultQuery }: Props) {
  const displayStatus = resolveDisplayStatus(business);
  const latestScan = scans[0];
  const activeScan = scans.find((s) => s.status === 'queued' || s.status === 'running');
  const latestCompletedScan = scans.find((s) => s.status === 'completed');
  const isManualApprovalRequired = displayStatus === 'manual_approval_required';
  const retryEligible =
    latestScan?.status === 'failed' &&
    !!latestScan.failureCategory &&
    isRetryableFailureCategory(latestScan.failureCategory);

  const generatedPreview = latestCompletedScan?.generatedPreviewId
    ? previews.find((p) => p.previewId === latestCompletedScan.generatedPreviewId)
    : undefined;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Website Enrichment</h3>
      </div>

      {resultQuery && <ResultBanner result={resultQuery} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <Field label="Website URL" value={business.websiteUrl || '—'} mono={!!business.websiteUrl} />
        <Field label="Enrichment status" value={ENRICHMENT_STATUS_LABELS[displayStatus]} />
        <div>
          <div className="text-xs text-gray-400">Latest scan status</div>
          {latestScan ? (
            <Link href={`/admin/scans/${latestScan.scanId}`} className="text-(--color-brand) hover:underline">
              {SCAN_STATUS_LABELS[latestScan.status]} →
            </Link>
          ) : (
            <div className="text-gray-900">Never run</div>
          )}
        </div>
        <Field
          label="Latest scan time"
          value={latestScan ? new Date(latestScan.createdAt).toLocaleString() : '—'}
        />
        <Field
          label="Latest successful enrichment"
          value={latestCompletedScan ? new Date(latestCompletedScan.completedAt ?? latestCompletedScan.createdAt).toLocaleString() : '—'}
        />
        {latestScan?.status === 'failed' && latestScan.failureCategory && (
          <Field label="Latest failure" value={FAILURE_CATEGORY_LABELS[latestScan.failureCategory]} />
        )}
      </div>

      {business.manualApprovalNote && (
        <div
          className={
            isManualApprovalRequired
              ? 'rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'
              : 'rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600'
          }
        >
          {isManualApprovalRequired && <p className="font-medium mb-1">Manual approval required</p>}
          <p>{business.manualApprovalNote}</p>
          {business.manualApprovalReason && (
            <p className="mt-1 text-xs opacity-75">Reason: {MANUAL_APPROVAL_REASON_LABELS[business.manualApprovalReason]}</p>
          )}
        </div>
      )}

      {generatedPreview && (
        <a
          href={`/b/${generatedPreview.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-(--color-brand) hover:underline"
        >
          View generated preview (v{generatedPreview.version}) ↗
        </a>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <form action={enrichWebsiteAction.bind(null, business.businessId)}>
          <button
            type="submit"
            disabled={!!activeScan}
            className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {activeScan ? 'Scan in progress…' : 'Enrich Website'}
          </button>
        </form>

        {retryEligible && latestScan && (
          <form action={retryEnrichmentAction.bind(null, business.businessId, latestScan.scanId)}>
            <button
              type="submit"
              disabled={!!activeScan}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Retry
            </button>
          </form>
        )}
      </div>

      {!business.websiteUrl && !isManualApprovalRequired && (
        <p className="text-xs text-gray-400">
          Add a website URL under Business Details to enable Firecrawl enrichment, or upload photos and use
          &quot;Generate Website&quot; for a manual-only site.
        </p>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`text-gray-900 ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</div>
    </div>
  );
}

const RESULT_BANNER_COPY: Record<string, { tone: 'success' | 'warning' | 'error'; text: string }> = {
  completed: { tone: 'success', text: 'Website enrichment completed — a new preview version was generated.' },
  manual_approval_required: {
    tone: 'warning',
    text: 'No website was available for Firecrawl enrichment. No images were downloaded. Manual image sourcing and approval are required.',
  },
  conflict: { tone: 'warning', text: 'A scan for this business is already queued or running.' },
  failed: { tone: 'error', text: 'The enrichment attempt failed. See the failure details below — retry if eligible.' },
  not_eligible_for_retry: { tone: 'error', text: 'This failure is not eligible for automatic retry.' },
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
