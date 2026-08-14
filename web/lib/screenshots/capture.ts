import 'server-only';
import { InvokeCommand } from '@aws-sdk/client-lambda';
import type { ScanEvent, ScanTargetType } from '@/domain/models/scan-event';
import { createScanEvent } from '@/domain/factories/scan-event.factory';
import { getBusinessById } from '@/lib/db/businesses';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { listScansForBusiness, putScanEvent } from '@/lib/db/scan-events';
import { getLambdaClient, getScreenshotLambdaFunctionName } from '@/lib/lambda/client';
import { log } from '@/lib/logging/log';

/**
 * Stage 14 (Playwright Screenshots) — starts an asynchronous screenshot
 * capture for one of a business's two targets (see `implementation.md`,
 * Stage 14, "Screenshot targets"). This module only ever creates a `queued`
 * ScanEvent and fires an async Lambda invocation — it never waits for
 * Playwright, and the Lambda itself owns every subsequent status
 * transition, S3 upload, and `captureResults` write (see "Workflow" and
 * "Lambda payload" in the same doc). Mirrors
 * `lib/firecrawl/enrich-business.ts`'s orchestration style (small named
 * steps, no monolithic action) but is deliberately much shorter, since the
 * actual capture work happens out-of-process.
 */

export const SCREENSHOT_CONFLICT_MESSAGE = 'A screenshot capture for this target is already queued or running.';

/** Matches implementation.md, Stage 14, "Failure destination and stale-scan recovery". */
export const STALE_SCAN_THRESHOLD_MS = 10 * 60 * 1000;

export interface ScreenshotCaptureOutcome {
  status: 'queued' | 'conflict' | 'not_eligible' | 'failed';
  scanId?: string;
  message?: string;
}

interface LambdaInvokePayload {
  businessId: string;
  scanId: string;
  targetType: ScanTargetType;
  previewId?: string;
}

async function invokeScreenshotLambda(payload: LambdaInvokePayload): Promise<void> {
  const client = getLambdaClient();
  await client.send(
    new InvokeCommand({
      FunctionName: getScreenshotLambdaFunctionName(),
      InvocationType: 'Event', // async — never awaited beyond the invoke call itself
      Payload: Buffer.from(JSON.stringify(payload)),
    }),
  );
}

async function hasActiveScan(businessId: string, targetType: ScanTargetType): Promise<boolean> {
  const scans = await listScansForBusiness(businessId);
  return scans.some(
    (s) =>
      s.provider === 'playwright' &&
      s.targetType === targetType &&
      (s.status === 'queued' || s.status === 'running'),
  );
}

/**
 * True once a `queued`/`running` Playwright ScanEvent has sat non-terminal
 * past `STALE_SCAN_THRESHOLD_MS` — see "Failure destination and stale-scan
 * recovery". Checked on page render, not by a background job (this stage
 * has no automation — see "No automatic chaining").
 */
export function isStaleScan(scan: ScanEvent): boolean {
  if (scan.provider !== 'playwright') return false;
  if (scan.status !== 'queued' && scan.status !== 'running') return false;
  return Date.now() - new Date(scan.createdAt).getTime() > STALE_SCAN_THRESHOLD_MS;
}

/**
 * Starts an `existing_site` capture. Never invoked when the business has no
 * `websiteUrl` — the admin UI shows "No existing website available" instead
 * (see "Screenshot targets").
 */
export async function captureExistingSiteScreenshot(businessId: string): Promise<ScreenshotCaptureOutcome> {
  const business = await getBusinessById(businessId);
  if (!business) return { status: 'failed', message: 'Business not found.' };

  const websiteUrl = business.websiteUrl?.trim();
  if (!websiteUrl) {
    return { status: 'not_eligible', message: 'This business has no website on file to capture.' };
  }

  if (await hasActiveScan(businessId, 'existing_site')) {
    return { status: 'conflict', message: SCREENSHOT_CONFLICT_MESSAGE };
  }

  const scan = createScanEvent({
    businessId,
    provider: 'playwright',
    operation: 'screenshot',
    targetType: 'existing_site',
    sourceUrl: websiteUrl,
  });
  await putScanEvent(scan);

  try {
    await invokeScreenshotLambda({ businessId, scanId: scan.scanId, targetType: 'existing_site' });
  } catch (err) {
    // The invocation call itself failed synchronously (e.g. IAM/network) —
    // distinct from the Lambda's own async failure path (DLQ). Mark the
    // ScanEvent failed immediately rather than leaving it stuck queued with
    // nothing ever having been dispatched.
    const message = err instanceof Error ? err.message : 'Failed to start the screenshot capture.';
    await putScanEvent({ ...scan, status: 'failed', failureCategory: 'unknown', failureMessage: message, completedAt: new Date().toISOString() });
    log({
      level: 'error',
      event: 'scan.screenshot.invoke_failed',
      component: 'screenshot-capture',
      businessId,
      scanId: scan.scanId,
      provider: 'playwright',
      operation: 'existing_site',
      errorCategory: 'unknown',
      message,
    });
    return { status: 'failed', scanId: scan.scanId, message };
  }

  return { status: 'queued', scanId: scan.scanId };
}

/**
 * Starts a `generated_preview` capture of the business's current (most
 * recent) SitePreview. Works even when the business never had a website —
 * see "Screenshot targets".
 */
export async function captureGeneratedPreviewScreenshot(businessId: string): Promise<ScreenshotCaptureOutcome> {
  const business = await getBusinessById(businessId);
  if (!business) return { status: 'failed', message: 'Business not found.' };

  const previews = await listPreviewsForBusiness(businessId);
  const currentPreview = previews[0]; // newest first — see listPreviewsForBusiness
  if (!currentPreview) {
    return { status: 'not_eligible', message: 'This business has no generated preview yet to capture.' };
  }

  if (await hasActiveScan(businessId, 'generated_preview')) {
    return { status: 'conflict', message: SCREENSHOT_CONFLICT_MESSAGE };
  }

  const scan = createScanEvent({
    businessId,
    provider: 'playwright',
    operation: 'screenshot',
    targetType: 'generated_preview',
    previewId: currentPreview.previewId,
  });
  await putScanEvent(scan);

  try {
    await invokeScreenshotLambda({
      businessId,
      scanId: scan.scanId,
      targetType: 'generated_preview',
      previewId: currentPreview.previewId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start the screenshot capture.';
    await putScanEvent({ ...scan, status: 'failed', failureCategory: 'unknown', failureMessage: message, completedAt: new Date().toISOString() });
    log({
      level: 'error',
      event: 'scan.screenshot.invoke_failed',
      component: 'screenshot-capture',
      businessId,
      scanId: scan.scanId,
      provider: 'playwright',
      operation: 'generated_preview',
      errorCategory: 'unknown',
      message,
    });
    return { status: 'failed', scanId: scan.scanId, message };
  }

  return { status: 'queued', scanId: scan.scanId };
}

export interface MarkStaleScanOutcome {
  status: 'marked_failed' | 'not_eligible' | 'failed';
  message?: string;
}

/**
 * Admin override for a scan stuck past the staleness threshold (see
 * `isStaleScan`) — marks it `failed` so a fresh capture can be started.
 * Never transitions a scan that isn't actually stale (re-checked here, not
 * just trusted from the UI that offered the button).
 */
export async function markStaleScanFailed(businessId: string, scanId: string): Promise<MarkStaleScanOutcome> {
  const scans = await listScansForBusiness(businessId);
  const scan = scans.find((s) => s.scanId === scanId);
  if (!scan) return { status: 'failed', message: 'Scan not found.' };
  if (!isStaleScan(scan)) return { status: 'not_eligible', message: 'This scan is not yet stale.' };

  await putScanEvent({
    ...scan,
    status: 'failed',
    failureCategory: 'unknown',
    failureMessage: 'Marked failed by an admin after exceeding the staleness threshold with no response from the Lambda.',
    completedAt: new Date().toISOString(),
  });
  log({
    level: 'warn',
    event: 'scan.screenshot.marked_stale',
    component: 'screenshot-capture',
    businessId,
    scanId,
    provider: 'playwright',
    status: 'failed',
    errorCategory: 'unknown',
  });
  return { status: 'marked_failed' };
}
