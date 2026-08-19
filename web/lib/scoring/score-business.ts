import 'server-only';
import { z } from 'zod';
import type { Business } from '@/domain/models/business';
import type { ScanEvent, ScanFailureCategory } from '@/domain/models/scan-event';
import type { WebsiteEnrichmentSnapshot } from '@/domain/models/website-enrichment';
import { WebsiteEnrichmentSnapshotSchema } from '@/domain/schemas/website-enrichment.schema';
import { getBusinessById, updateBusiness } from '@/lib/db/businesses';
import { listScansForBusiness, putScanEvent } from '@/lib/db/scan-events';
import { createScanEvent } from '@/domain/factories/scan-event.factory';
import { getAsset, putAsset, getSignedAssetUrl } from '@/lib/s3/assets';
import { scoreWebsite } from '@/lib/ai/score-website';
import { computeDeterministicMetrics } from './deterministic-metrics';
import { applyQualificationOverrides } from './qualification-rules';
import { log } from '@/lib/logging/log';

/**
 * Orchestrates one Stage 15 (AI Prospect Qualification & Website Analysis)
 * scoring attempt end to end — the same "small named steps, one ScanEvent
 * per attempt" shape as `lib/firecrawl/enrich-business.ts`. `Business` is
 * loaded once and only ever mutated for its qualification-disposition
 * fields (`qualification`/`leadPriority`/`websiteQualityScore`) — never for
 * anything AI-discovered about the business itself.
 *
 * Scoring requires a completed Firecrawl scan (Stage 13) to already exist —
 * this stage evaluates evidence Stages 12-14 already gathered, it never
 * crawls a website itself. Screenshots (Stage 14) are used when available
 * but are not required to run scoring.
 */

const NO_WEBSITE_QUALIFIED_MESSAGE =
  'No website on file — automatically qualified per Stage 15 qualification rules. No AI assessment was run.';
const WEBSITE_UNAVAILABLE_NOTE =
  "The business's website could not be reached during Firecrawl enrichment — flagged for manual review. No AI assessment was run.";

export const SCORING_CONFLICT_MESSAGE = 'A scoring attempt for this business is already queued or running.';

const WEBSITE_UNAVAILABLE_FAILURE_CATEGORIES: ReadonlySet<ScanFailureCategory> = new Set([
  'website_unreachable',
  'website_error_response',
  'blocked_url',
  'invalid_url',
]);

export interface ScoringOutcome {
  status: 'completed' | 'manual_approval_required' | 'failed' | 'conflict' | 'not_eligible';
  scanId?: string;
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

function hasActiveScoringScan(scans: ScanEvent[]): boolean {
  return scans.some((s) => s.provider === 'openai' && s.operation === 'score' && (s.status === 'queued' || s.status === 'running'));
}

/**
 * Maps a scoring-attempt failure to a `ScanFailureCategory`. Distinct from
 * `mapFirecrawlErrorCategory` in `enrich-business.ts` — this stage's
 * failures come from the OpenAI SDK and the app's own schema
 * re-validation, not a scrape provider.
 */
function classifyAiError(err: unknown): ScanFailureCategory {
  if (err instanceof z.ZodError) return 'invalid_ai_schema_output';
  const message = err instanceof Error ? err.message : '';
  const name = err instanceof Error ? err.name : '';
  if (/parsable structured output/i.test(message)) return 'invalid_ai_schema_output';
  if (/timeout/i.test(message) || /timeout/i.test(name)) return 'ai_timeout';
  return 'ai_request_failed';
}

async function finishFailed(scan: ScanEvent, category: ScanFailureCategory, message: string): Promise<ScoringOutcome> {
  await saveScan({ ...scan, status: 'failed', failureCategory: category, failureMessage: message, completedAt: nowIso() });
  log({
    level: 'error',
    event: 'scan.score.failed',
    component: 'ai-scoring',
    businessId: scan.businessId,
    scanId: scan.scanId,
    provider: 'openai',
    operation: 'score',
    status: 'failed',
    errorCategory: category,
    message,
  });
  return { status: 'failed', scanId: scan.scanId, message };
}

/** No-website shortcut — never calls OpenAI, matches `enrich-business.ts`'s `handleMissingWebsite` shape. */
async function handleNoWebsite(business: Business): Promise<ScoringOutcome> {
  const scan = createScanEvent({ businessId: business.businessId, provider: 'openai', operation: 'score' });
  const terminal: ScanEvent = { ...scan, status: 'completed', completedAt: nowIso() };
  await saveScan(terminal);

  await updateBusiness(business.businessId, { qualification: 'qualified' });

  return { status: 'completed', scanId: terminal.scanId, message: NO_WEBSITE_QUALIFIED_MESSAGE };
}

/** Website-unreachable shortcut — the Firecrawl scan already established this; no need to call OpenAI with no content to evaluate. */
async function handleWebsiteUnavailable(business: Business, firecrawlScan: ScanEvent): Promise<ScoringOutcome> {
  const scan = createScanEvent({
    businessId: business.businessId,
    provider: 'openai',
    operation: 'score',
    sourceUrl: business.websiteUrl,
  });
  const terminal: ScanEvent = { ...scan, status: 'manual_approval_required', failureMessage: WEBSITE_UNAVAILABLE_NOTE, completedAt: nowIso() };
  await saveScan(terminal);

  const qualification = applyQualificationOverrides({
    business,
    aiQualification: 'manual_review',
    firecrawlFailureCategory: firecrawlScan.failureCategory,
  });
  await updateBusiness(business.businessId, { qualification });

  return { status: 'manual_approval_required', scanId: terminal.scanId, message: WEBSITE_UNAVAILABLE_NOTE };
}

async function loadSnapshot(firecrawlScan: ScanEvent): Promise<WebsiteEnrichmentSnapshot | undefined> {
  if (!firecrawlScan.extractedArtifactKey) return undefined;
  const buffer = await getAsset(firecrawlScan.extractedArtifactKey);
  if (!buffer) return undefined;
  try {
    return WebsiteEnrichmentSnapshotSchema.parse(JSON.parse(buffer.toString('utf8')));
  } catch {
    return undefined;
  }
}

async function loadScreenshotUrls(
  screenshotScan: ScanEvent | undefined,
): Promise<{ desktopUrl?: string; mobileUrl?: string } | undefined> {
  const desktopKey = screenshotScan?.captureResults?.desktop?.status === 'completed' ? screenshotScan.captureResults.desktop.storageKey : undefined;
  const mobileKey = screenshotScan?.captureResults?.mobile?.status === 'completed' ? screenshotScan.captureResults.mobile.storageKey : undefined;
  if (!desktopKey && !mobileKey) return undefined;

  const [desktopUrl, mobileUrl] = await Promise.all([
    desktopKey ? getSignedAssetUrl(desktopKey, 600) : Promise.resolve(undefined),
    mobileKey ? getSignedAssetUrl(mobileKey, 600) : Promise.resolve(undefined),
  ]);
  return { desktopUrl, mobileUrl };
}

/** The core metrics → AI scoring → persist pipeline for one running ScanEvent. */
async function runScoringAttempt(
  business: Business,
  firecrawlScan: ScanEvent,
  screenshotScan: ScanEvent | undefined,
): Promise<ScoringOutcome> {
  let scan = await saveScan(
    createScanEvent({ businessId: business.businessId, provider: 'openai', operation: 'score', sourceUrl: business.websiteUrl }),
  );
  scan = await saveScan({ ...scan, status: 'running', startedAt: nowIso() });

  const snapshot = await loadSnapshot(firecrawlScan);
  const screenshots = await loadScreenshotUrls(screenshotScan);
  const metrics = computeDeterministicMetrics({ business, firecrawlScan, snapshot, screenshotScan });
  scan = await saveScan({ ...scan, deterministicMetrics: metrics });

  let scored;
  try {
    scored = await scoreWebsite({ business, snapshot, metrics, screenshots });
  } catch (err) {
    const category = classifyAiError(err);
    const message = err instanceof Error ? err.message : 'AI scoring failed.';
    return finishFailed(scan, category, message);
  }

  const aiResponseArtifactKey = `scans/${business.businessId}/${scan.scanId}/ai-response.json`;
  try {
    await putAsset(aiResponseArtifactKey, Buffer.from(JSON.stringify(scored.raw)), 'application/json');
  } catch {
    return finishFailed(scan, 'artifact_storage_failed', 'Failed to store the raw AI response artifact.');
  }

  scan = await saveScan({
    ...scan,
    status: 'completed',
    assessment: scored.assessment,
    aiResponseArtifactKey,
    aiMetadata: {
      model: scored.metadata.model,
      promptVersion: scored.metadata.promptVersion,
    },
    completedAt: nowIso(),
  });

  const qualification = applyQualificationOverrides({
    business,
    aiQualification: scored.assessment.qualification,
    overallScore: scored.assessment.overallScore,
    leadPriority: scored.assessment.leadPriority,
  });

  await updateBusiness(business.businessId, {
    qualification,
    leadPriority: scored.assessment.leadPriority,
    websiteQualityScore: scored.assessment.overallScore,
  });

  log({
    event: 'scan.score.completed',
    component: 'ai-scoring',
    businessId: business.businessId,
    scanId: scan.scanId,
    provider: 'openai',
    operation: 'score',
    status: 'completed',
  });
  return { status: 'completed', scanId: scan.scanId };
}

/**
 * Starts a fresh Stage 15 scoring attempt for a business. Safe to call
 * repeatedly — each call creates a brand-new `ScanEvent`; nothing is
 * mutated in place.
 */
export async function scoreBusinessWebsite(businessId: string): Promise<ScoringOutcome> {
  const business = await getBusinessById(businessId);
  if (!business) return { status: 'failed', message: 'Business not found.' };

  const scans = await listScansForBusiness(businessId);
  if (hasActiveScoringScan(scans)) {
    return { status: 'conflict', message: SCORING_CONFLICT_MESSAGE };
  }

  if (!business.websiteUrl?.trim()) {
    return handleNoWebsite(business);
  }

  const firecrawlScan = scans.find((s) => s.provider === 'firecrawl' && s.operation === 'scrape');
  if (!firecrawlScan || firecrawlScan.status === 'queued' || firecrawlScan.status === 'running') {
    return { status: 'not_eligible', message: 'Run Firecrawl enrichment for this business before scoring.' };
  }

  if (firecrawlScan.status === 'failed') {
    if (firecrawlScan.failureCategory && WEBSITE_UNAVAILABLE_FAILURE_CATEGORIES.has(firecrawlScan.failureCategory)) {
      return handleWebsiteUnavailable(business, firecrawlScan);
    }
    return { status: 'not_eligible', message: 'The latest Firecrawl enrichment failed — resolve or retry it before scoring.' };
  }

  if (firecrawlScan.status === 'manual_approval_required') {
    return { status: 'not_eligible', message: 'Firecrawl enrichment requires manual approval before scoring.' };
  }

  // firecrawlScan.status is 'completed' here — 'partial' is a Playwright-only status.
  const screenshotScan = scans.find(
    (s) => s.provider === 'playwright' && s.targetType === 'existing_site' && (s.status === 'completed' || s.status === 'partial'),
  );

  return runScoringAttempt(business, firecrawlScan, screenshotScan);
}
