import { getItem, conditionalUpdateStatus, putScreenshot, getSecretJson } from './aws';
import { validateOutboundUrl } from './url-validation';
import { buildPreviewUrl } from './same-origin';
import { mintCaptureToken } from './capture-token';
import { launchBrowser, captureViewport, ScreenshotCaptureError, VIEWPORTS, type ViewportName } from './browser';
import type { BusinessRecord, CapturePayload, ScanCaptureResults, ScanEventRecord, ScanFailureCategory, SitePreviewRecord, ViewportCaptureResult } from './types';

/**
 * Stage 14 (Playwright Screenshots) Lambda entrypoint — owns the whole
 * capture lifecycle end to end (load → validate → launch → capture ×2
 * viewports → upload → update ScanEvent), per implementation.md, Stage 14,
 * "Workflow" and "Lambda payload". The invoking Server Action
 * (`web/lib/screenshots/capture.ts`) never waits on any of this — it only
 * ever creates the `queued` ScanEvent and fires this invocation
 * asynchronously.
 */

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set`);
  return value;
}

function nowIso(): string {
  return new Date().toISOString();
}

function targetFolder(targetType: CapturePayload['targetType']): 'existing' | 'preview' {
  return targetType === 'existing_site' ? 'existing' : 'preview';
}

/** Best-effort terminal write when something unexpected happens outside the normal per-viewport error handling. Rethrows if even this fails, so the invocation is reported failed to AWS and reaches the DLQ (see "Failure destination and stale-scan recovery"). */
async function failScan(scanId: string, category: ScanFailureCategory, message: string): Promise<void> {
  const ok = await conditionalUpdateStatus({
    tableName: env('SCAN_EVENTS_TABLE_NAME'),
    key: { scanId },
    expectedCurrentStatus: 'running',
    updates: { status: 'failed', failureCategory: category, failureMessage: message, completedAt: nowIso(), updatedAt: nowIso() },
  });
  if (!ok) {
    // The record wasn't 'running' when we tried (e.g. we never got past the
    // queued→running transition, or a duplicate delivery already
    // terminalized it) — nothing more this function can safely do.
    console.warn(`failScan: conditional update did not apply for scanId=${scanId} (record not in 'running' state)`);
  }
}

export async function handler(event: CapturePayload): Promise<void> {
  const scanEventsTable = env('SCAN_EVENTS_TABLE_NAME');

  const scan = await getItem<ScanEventRecord>(scanEventsTable, { scanId: event.scanId });
  if (!scan || scan.businessId !== event.businessId || scan.targetType !== event.targetType) {
    // The invocation payload is identifiers-only and the Lambda always
    // re-verifies against the canonical record — see "Lambda payload". A
    // mismatch here means something is wrong upstream; there is no
    // ScanEvent we can safely update, so just log and stop.
    console.error(`handler: ScanEvent ${event.scanId} not found or does not match the invocation payload`);
    return;
  }

  // Idempotency guard — see "Idempotency and status transitions": a rare
  // duplicate Lambda delivery for the same scanId must never re-launch a
  // browser once the first delivery already reached a terminal state.
  if (scan.status !== 'queued' && scan.status !== 'running') {
    console.info(`handler: ScanEvent ${event.scanId} is already terminal (${scan.status}) — exiting without launching a browser.`);
    return;
  }

  if (scan.status === 'queued') {
    const claimed = await conditionalUpdateStatus({
      tableName: scanEventsTable,
      key: { scanId: event.scanId },
      expectedCurrentStatus: 'queued',
      updates: { status: 'running', startedAt: nowIso(), updatedAt: nowIso() },
    });
    if (!claimed) {
      console.info(`handler: ScanEvent ${event.scanId} was already claimed by another invocation — exiting.`);
      return;
    }
  }
  // If scan.status was already 'running' (e.g. this Lambda invocation is
  // itself the duplicate delivery landing before the first one finished),
  // we deliberately proceed rather than exit — the two-attempt-overlap
  // risk this leaves open is a documented, accepted tradeoff for this
  // stage (see "Idempotency and status transitions", "Known open risk").

  // ── Resolve the target URL, re-validated here rather than trusted from
  // the invocation payload (which carries no URL at all) — see "Lambda
  // payload". ─────────────────────────────────────────────────────────
  let targetUrl: string;
  let captureToken: { cookieDomain: string; token: string } | undefined;

  if (event.targetType === 'existing_site') {
    const business = await getItem<BusinessRecord>(env('BUSINESSES_TABLE_NAME'), { businessId: event.businessId });
    const rawUrl = business?.websiteUrl?.trim();
    if (!rawUrl) {
      await failScan(event.scanId, 'invalid_url', 'Business has no websiteUrl on file.');
      return;
    }
    const validation = await validateOutboundUrl(rawUrl);
    if (!validation.ok || !validation.normalizedUrl) {
      const category = validation.reason === 'private_or_blocked_address' ? 'blocked_url' : 'invalid_url';
      await failScan(event.scanId, category, 'The business website URL is not a valid, publicly reachable address.');
      return;
    }
    targetUrl = validation.normalizedUrl;
  } else {
    if (!event.previewId) {
      await failScan(event.scanId, 'invalid_url', 'generated_preview capture with no previewId in the ScanEvent.');
      return;
    }
    const preview = await getItem<SitePreviewRecord>(env('SITE_PREVIEWS_TABLE_NAME'), { previewId: event.previewId });
    if (!preview) {
      await failScan(event.scanId, 'invalid_url', 'Referenced SitePreview no longer exists.');
      return;
    }
    const appBaseUrl = env('WEBPRESA_APP_BASE_URL');
    const built = buildPreviewUrl(appBaseUrl, preview.slug);
    if (!built.ok || !built.url) {
      await failScan(event.scanId, 'invalid_url', 'Could not construct a same-origin preview URL.');
      return;
    }
    targetUrl = built.url;

    const { signingKey } = await getSecretJson(env('CAPTURE_TOKEN_SECRET_NAME'));
    const token = await mintCaptureToken({ previewId: event.previewId, scanId: event.scanId, signingKey });
    captureToken = { cookieDomain: new URL(appBaseUrl).hostname, token };
  }

  // ── Launch + capture. One failed viewport never aborts the other — see
  // "Partial success handling". ───────────────────────────────────────
  const captureResults: ScanCaptureResults = {};
  let browser: Awaited<ReturnType<typeof launchBrowser>> | undefined;

  try {
    browser = await launchBrowser();
  } catch (err) {
    const category = err instanceof ScreenshotCaptureError ? err.category : 'browser_launch_failed';
    const message = err instanceof Error ? err.message : 'Failed to launch the browser.';
    const failedResult: ViewportCaptureResult = { status: 'failed', failureCategory: category, failureMessage: message };
    await conditionalUpdateStatus({
      tableName: scanEventsTable,
      key: { scanId: event.scanId },
      expectedCurrentStatus: 'running',
      updates: {
        status: 'failed',
        failureCategory: category,
        failureMessage: message,
        captureResults: { desktop: failedResult, mobile: failedResult },
        completedAt: nowIso(),
        updatedAt: nowIso(),
      },
    });
    return;
  }

  try {
    for (const viewport of Object.keys(VIEWPORTS) as ViewportName[]) {
      try {
        const screenshot = await captureViewport({ browser, url: targetUrl, viewport, captureToken });
        const storageKey = `scans/${event.businessId}/${event.scanId}/${targetFolder(event.targetType)}/${viewport}.png`;
        try {
          await putScreenshot(env('ASSETS_BUCKET_NAME'), storageKey, screenshot);
          captureResults[viewport] = { status: 'completed', storageKey };
        } catch (uploadErr) {
          const message = uploadErr instanceof Error ? uploadErr.message : 'Failed to upload screenshot.';
          captureResults[viewport] = { status: 'failed', failureCategory: 'upload_failed', failureMessage: message };
        }
      } catch (err) {
        const category = err instanceof ScreenshotCaptureError ? err.category : 'unknown';
        const message = err instanceof Error ? err.message : `Unknown error capturing the ${viewport} viewport.`;
        captureResults[viewport] = { status: 'failed', failureCategory: category, failureMessage: message };
      }
    }
  } finally {
    await browser.close().catch(() => undefined);
  }

  const desktopOk = captureResults.desktop?.status === 'completed';
  const mobileOk = captureResults.mobile?.status === 'completed';
  const overallStatus = desktopOk && mobileOk ? 'completed' : desktopOk || mobileOk ? 'partial' : 'failed';

  // Top-level failureCategory/failureMessage stay the whole-scan summary —
  // only set when nothing succeeded; a 'partial' result's detail lives
  // entirely in captureResults (see domain-model doc comment).
  const summaryFailure =
    overallStatus === 'failed' ? (captureResults.desktop ?? captureResults.mobile) : undefined;

  const applied = await conditionalUpdateStatus({
    tableName: scanEventsTable,
    key: { scanId: event.scanId },
    expectedCurrentStatus: 'running',
    updates: {
      status: overallStatus,
      captureResults,
      completedAt: nowIso(),
      updatedAt: nowIso(),
      ...(summaryFailure?.failureCategory ? { failureCategory: summaryFailure.failureCategory } : {}),
      ...(summaryFailure?.failureMessage ? { failureMessage: summaryFailure.failureMessage } : {}),
    },
  });

  if (!applied) {
    console.warn(`handler: final conditional update did not apply for scanId=${event.scanId} (record was not 'running')`);
  }
}
