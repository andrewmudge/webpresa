import 'server-only';
import type { Business } from '@/domain/models/business';
import type { ScanEvent, ScanFailureCategory } from '@/domain/models/scan-event';
import { getBusinessById, updateBusiness } from '@/lib/db/businesses';
import { getScanEventById, listScansForBusiness, putScanEvent } from '@/lib/db/scan-events';
import { listPreviewsForBusiness, putSitePreview } from '@/lib/db/site-previews';
import { createScanEvent } from '@/domain/factories/scan-event.factory';
import { createSitePreview } from '@/domain/factories/site-preview.factory';
import { putAsset } from '@/lib/s3/assets';
import { scrapeWebsite, FirecrawlApiError, type FirecrawlErrorCategory, type FirecrawlScrapeData } from './client';
import { validateOutboundUrl } from '@/lib/security/url-validation';
import { normalizeFirecrawlResponse } from './normalize';
import { ingestScanImages } from './images';
import { generatePreviewContent } from '@/lib/ai/generate-preview';
import { isRetryableFailureCategory, computeAutomaticRetryDelayMs, MAX_AUTOMATIC_RETRIES } from './retry';

/**
 * Orchestrates one Firecrawl website-enrichment attempt end to end — the
 * 20-checkpoint flow from implementation.md, Stage 13, split into small
 * named steps rather than one unreadable function. `Business` is loaded
 * once and never mutated except for its `enrichmentStatus`/
 * `manualApprovalReason`/`manualApprovalNote` disposition fields — no
 * Firecrawl-discovered content is ever written back onto it.
 */

const NO_WEBSITE_NOTE =
  'No website was available for Firecrawl enrichment. No images were downloaded. Manual image sourcing and approval are required.';
const NO_USABLE_IMAGES_NOTE = 'No usable website images were found or downloaded. Manual image sourcing may be required.';

export const ENRICHMENT_CONFLICT_MESSAGE = 'A scan for this business is already queued or running.';

export interface EnrichmentOutcome {
  status: 'completed' | 'manual_approval_required' | 'failed' | 'conflict' | 'not_eligible_for_retry';
  scanId?: string;
  previewId?: string;
  /** Safe, admin-facing summary — never a raw provider error. */
  message?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function saveScan(scan: ScanEvent): Promise<ScanEvent> {
  const updated: ScanEvent = { ...scan, updatedAt: nowIso() };
  await putScanEvent(updated);
  return updated;
}

async function hasActiveScan(businessId: string): Promise<boolean> {
  const scans = await listScansForBusiness(businessId);
  return scans.some((s) => s.status === 'queued' || s.status === 'running');
}

function mapFirecrawlErrorCategory(category: FirecrawlErrorCategory): ScanFailureCategory {
  switch (category) {
    case 'auth':
      return 'firecrawl_auth';
    case 'rate_limit':
      return 'firecrawl_rate_limit';
    case 'timeout':
      return 'firecrawl_timeout';
    case 'provider_error':
      return 'firecrawl_provider_error';
    case 'unreachable':
      return 'website_unreachable';
    default:
      return 'unknown';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls Firecrawl, honoring bounded automatic retry (exponential backoff +
 * jitter, `Retry-After` when supplied) for transient categories only. This
 * happens *within* a single ScanEvent attempt — it never creates a new
 * ScanEvent. Only a cross-attempt retry (`retryEnrichmentScan`, admin- or
 * caller-triggered) does that.
 */
async function scrapeWithBoundedRetry(url: string): Promise<FirecrawlScrapeData> {
  let lastError: FirecrawlApiError | undefined;
  for (let inlineAttempt = 1; inlineAttempt <= MAX_AUTOMATIC_RETRIES + 1; inlineAttempt++) {
    try {
      return await scrapeWebsite(url);
    } catch (err) {
      if (!(err instanceof FirecrawlApiError)) throw err;
      lastError = err;
      const category = mapFirecrawlErrorCategory(err.category);
      if (!isRetryableFailureCategory(category)) throw err;
      const delayMs = computeAutomaticRetryDelayMs(inlineAttempt, err.retryAfterSeconds);
      if (delayMs === undefined) throw err;
      await sleep(delayMs);
    }
  }
  throw lastError;
}

/** No-website path — never calls Firecrawl, never downloads any image. */
async function handleMissingWebsite(business: Business): Promise<EnrichmentOutcome> {
  const scan = createScanEvent({ businessId: business.businessId, provider: 'firecrawl', operation: 'scrape' });
  const terminal: ScanEvent = {
    ...scan,
    status: 'manual_approval_required',
    failureCategory: 'missing_website',
    failureMessage: NO_WEBSITE_NOTE,
    completedAt: nowIso(),
  };
  await saveScan(terminal);

  await updateBusiness(business.businessId, {
    enrichmentStatus: 'manual_approval_required',
    manualApprovalReason: 'missing_website',
    manualApprovalNote: NO_WEBSITE_NOTE,
  });

  return { status: 'manual_approval_required', scanId: terminal.scanId, message: NO_WEBSITE_NOTE };
}

async function markFailed(
  scan: ScanEvent,
  category: ScanFailureCategory,
  message: string,
): Promise<EnrichmentOutcome> {
  await saveScan({ ...scan, status: 'failed', failureCategory: category, failureMessage: message, completedAt: nowIso() });
  return { status: 'failed', scanId: scan.scanId, message };
}

/** The core scrape → normalize → store → generate → persist pipeline for one running ScanEvent. */
async function runAttempt(business: Business, queuedScan: ScanEvent, sourceUrl: string): Promise<EnrichmentOutcome> {
  let scan: ScanEvent = await saveScan({ ...queuedScan, status: 'running', startedAt: nowIso(), sourceUrl });
  await updateBusiness(business.businessId, { enrichmentStatus: 'enrichment_in_progress' });

  let data: FirecrawlScrapeData;
  try {
    data = await scrapeWithBoundedRetry(sourceUrl);
  } catch (err) {
    const category =
      err instanceof FirecrawlApiError ? mapFirecrawlErrorCategory(err.category) : 'unknown';
    const message = err instanceof Error ? err.message : 'Firecrawl scrape failed.';
    return finishFailed(business, scan, category, message);
  }

  // Firecrawl's own call to api.firecrawl.dev can succeed (`success: true`,
  // some markdown/title present — often a bot-block or challenge page) even
  // when the *target site* itself rejected the request. Check the target
  // site's reported status before the emptiness check below, since a block
  // page can easily carry a non-empty title/body that would otherwise pass
  // it and get scored as if it were the real site.
  const httpStatus = data.metadata?.statusCode;
  if (httpStatus !== undefined && httpStatus >= 400) {
    scan = await saveScan({ ...scan, httpStatus });
    return finishFailed(
      business,
      scan,
      'website_error_response',
      `The website returned an error response (HTTP ${httpStatus}) instead of real page content.`,
    );
  }

  if (!data.markdown?.trim() && !data.metadata?.title) {
    return finishFailed(business, scan, 'empty_content', 'Firecrawl returned no usable page content.');
  }

  let finalUrl: string | undefined;
  const rawFinalUrl = data.metadata?.url ?? data.metadata?.sourceURL;
  if (rawFinalUrl) {
    const finalUrlCheck = await validateOutboundUrl(rawFinalUrl);
    if (finalUrlCheck.ok) finalUrl = finalUrlCheck.normalizedUrl;
  }
  scan = await saveScan({ ...scan, httpStatus, ...(finalUrl ? { finalUrl } : {}) });

  // --- Store the raw (sanitized) artifact. No secrets are ever present in a
  // Firecrawl response, but only the fields this app actually reads are
  // persisted — never the full unbounded payload. ---
  const rawArtifactKey = `scans/${business.businessId}/${scan.scanId}/crawl.json`;
  try {
    await putAsset(
      rawArtifactKey,
      Buffer.from(JSON.stringify({ markdown: data.markdown, links: data.links, images: data.images, json: data.json, metadata: data.metadata })),
      'application/json',
    );
  } catch {
    return finishFailed(business, scan, 'artifact_storage_failed', 'Failed to store the raw scan artifact.');
  }
  scan = await saveScan({ ...scan, rawArtifactKey });

  // --- Normalize + store the validated snapshot. ---
  let snapshot;
  try {
    snapshot = normalizeFirecrawlResponse({ sourceUrl, finalUrl, data });
  } catch {
    return finishFailed(business, scan, 'normalization_failed', 'Firecrawl response could not be normalized into a valid snapshot.');
  }

  const extractedArtifactKey = `scans/${business.businessId}/${scan.scanId}/extracted.json`;
  try {
    await putAsset(extractedArtifactKey, Buffer.from(JSON.stringify(snapshot)), 'application/json');
  } catch {
    return finishFailed(business, scan, 'artifact_storage_failed', 'Failed to store the extracted snapshot artifact.');
  }
  scan = await saveScan({ ...scan, extractedArtifactKey });

  // --- Image ingestion. Failure here is never fatal to the scan — text
  // content is preserved and generation proceeds with the existing
  // image-free fallback (illustration hero, etc.). ---
  let images: ScanEvent['images'] = [];
  try {
    images = await ingestScanImages({ businessId: business.businessId, scanId: scan.scanId, candidateUrls: snapshot.imageReferences.map((i) => i.url) });
  } catch (error) {
    console.error('Scan image ingestion failed:', error instanceof Error ? error.message : error);
    images = [];
  }
  const hasAcceptedImages = images.some((img) => img.status === 'accepted');
  scan = await saveScan({ ...scan, images });

  // --- Generation: merge Business + snapshot, invoke the existing Stage 11 pipeline. ---
  const existingPreviews = await listPreviewsForBusiness(business.businessId);
  const previousVersion = existingPreviews.length > 0 ? Math.max(...existingPreviews.map((p) => p.version)) : 0;

  let generated;
  try {
    generated = await generatePreviewContent(business, {
      enrichment: { snapshot, scanImages: images, scanId: scan.scanId },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Website generation failed.';
    return finishFailed(business, scan, 'generation_failed', message);
  }

  let preview;
  try {
    preview = createSitePreview({
      businessId: business.businessId,
      slug: business.slug,
      templateId: 'local-business-v1',
      content: generated.content,
      theme: generated.theme,
      generationMetadata: generated.metadata,
      previousVersion,
    });
    await putSitePreview(preview);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to persist the generated preview.';
    return finishFailed(business, scan, 'preview_persistence_failed', message);
  }

  scan = await saveScan({ ...scan, status: 'completed', generatedPreviewId: preview.previewId, completedAt: nowIso() });

  // `manualApprovalReason`/`manualApprovalNote` can be meaningful even on a
  // completed run — a successful text scrape with no usable images still
  // flags `'no_usable_images'` so the admin knows manual image sourcing may
  // help, without treating the overall enrichment as failed (see
  // implementation.md, "Website exists but no usable images"). `updateBusiness`
  // merges partial updates against a freshly re-fetched record, so it's
  // never safe to pass explicit `undefined` to it (see its DynamoDB
  // UpdateExpression implementation) — every field set below is defined.
  await updateBusiness(business.businessId, {
    enrichmentStatus: 'enrichment_completed',
    ...(!hasAcceptedImages ? { manualApprovalReason: 'no_usable_images' as const, manualApprovalNote: NO_USABLE_IMAGES_NOTE } : {}),
  });

  return { status: 'completed', scanId: scan.scanId, previewId: preview.previewId };
}

async function finishFailed(
  business: Business,
  scan: ScanEvent,
  category: ScanFailureCategory,
  message: string,
): Promise<EnrichmentOutcome> {
  const outcome = await markFailed(scan, category, message);
  await updateBusiness(business.businessId, { enrichmentStatus: 'enrichment_failed' });
  return outcome;
}

/**
 * Starts a fresh Stage 13 enrichment attempt for a business. Safe to call
 * whether or not a preview already exists — creates version 1 when none
 * does, or the next version otherwise (see `runAttempt`).
 */
export async function enrichBusinessWebsite(businessId: string): Promise<EnrichmentOutcome> {
  const business = await getBusinessById(businessId);
  if (!business) return { status: 'failed', message: 'Business not found.' };

  if (await hasActiveScan(businessId)) {
    return { status: 'conflict', message: ENRICHMENT_CONFLICT_MESSAGE };
  }

  const rawUrl = business.websiteUrl?.trim();
  if (!rawUrl) {
    return handleMissingWebsite(business);
  }

  const validation = await validateOutboundUrl(rawUrl);
  if (!validation.ok || !validation.normalizedUrl) {
    const category: ScanFailureCategory = validation.reason === 'private_or_blocked_address' ? 'blocked_url' : 'invalid_url';
    // `rawUrl` may not even be syntactically a URL (that's one of the
    // rejection reasons) — only carry it as `sourceUrl` when it parses at
    // all, since `ScanEventSchema` validates that field as a URL.
    const syntacticallyValidUrl = (() => {
      try {
        new URL(rawUrl);
        return true;
      } catch {
        return false;
      }
    })();
    const scan = createScanEvent({
      businessId,
      provider: 'firecrawl',
      operation: 'scrape',
      ...(syntacticallyValidUrl ? { sourceUrl: rawUrl } : {}),
    });
    await saveScan(scan);
    return finishFailed(business, scan, category, 'The business website URL is not a valid, publicly reachable address.');
  }

  const queuedScan = createScanEvent({
    businessId,
    provider: 'firecrawl',
    operation: 'scrape',
    sourceUrl: validation.normalizedUrl,
  });
  await saveScan(queuedScan);

  return runAttempt(business, queuedScan, validation.normalizedUrl);
}

/**
 * Retries a prior failed attempt. Always creates a brand-new ScanEvent
 * (`retryOfScanId` + `attempt + 1`) — the prior `failed` ScanEvent is never
 * mutated back to `running`. Only eligible for automatic-retry-category
 * failures (rate limit, timeout, transient provider error); the admin UI
 * only offers this action for those categories, but it's re-checked here
 * too since this is also a valid programmatic entry point.
 */
export async function retryEnrichmentScan(businessId: string, previousScanId: string): Promise<EnrichmentOutcome> {
  const business = await getBusinessById(businessId);
  if (!business) return { status: 'failed', message: 'Business not found.' };

  if (await hasActiveScan(businessId)) {
    return { status: 'conflict', message: ENRICHMENT_CONFLICT_MESSAGE };
  }

  const previous = await getScanEventById(previousScanId);
  if (!previous || previous.businessId !== businessId) {
    return { status: 'failed', message: 'Prior scan not found.' };
  }
  if (previous.status !== 'failed' || !previous.failureCategory || !isRetryableFailureCategory(previous.failureCategory)) {
    return { status: 'not_eligible_for_retry', message: 'This failure is not eligible for retry.' };
  }
  if (!previous.sourceUrl) {
    return { status: 'not_eligible_for_retry', message: 'This failure is not eligible for retry.' };
  }

  const queuedScan = createScanEvent({
    businessId,
    provider: 'firecrawl',
    operation: 'scrape',
    sourceUrl: previous.sourceUrl,
    attempt: previous.attempt + 1,
    retryOfScanId: previous.scanId,
  });
  await saveScan(queuedScan);

  return runAttempt(business, queuedScan, previous.sourceUrl);
}
