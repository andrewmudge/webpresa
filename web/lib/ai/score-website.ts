import 'server-only';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import type { Business } from '@/domain/models/business';
import {
  ASSESSMENT_CATEGORIES,
  CONFIDENCE_LEVELS,
  LEAD_PRIORITIES,
  QUALIFICATION_RESULTS,
  WEBSITE_ASSESSMENT_SCHEMA_VERSION,
  type WebsiteAssessment,
  type WebsiteDeterministicMetrics,
} from '@/domain/models/website-assessment';
import type { WebsiteEnrichmentSnapshot } from '@/domain/models/website-enrichment';
import { WebsiteAssessmentSchema } from '@/domain/schemas/website-assessment.schema';
import { getOpenAiClient, getOpenAiScoringModel } from './client';

/**
 * Stage 15 (AI Prospect Qualification & Website Analysis) — the AI scoring
 * call itself. Mirrors `generate-preview.ts`'s structure (one structured-
 * output request via `chat.completions.parse` + `zodResponseFormat`,
 * re-validated app-side afterward as defense in depth) but is a read-only
 * *assessment* of evidence already gathered by Stages 12-14, not a content-
 * generation call — the model never invents facts here either, it can only
 * describe what it was given.
 */

const RESPONSE_FORMAT_NAME = 'webpresa_website_assessment';
export const SCORING_PROMPT_VERSION = '2026-07-24';

// No `temperature` override is sent — `gpt-5.5` (the DEFAULT_SCORING_MODEL
// in `client.ts`) is a reasoning-class model and rejects any value other
// than the API default (1): "Unsupported value: 'temperature' does not
// support 0.3 with this model." A configured `OPENAI_SCORING_MODEL` swap to
// a non-reasoning model would silently lose temperature control under this
// approach — acceptable for now since every model this stage has actually
// targeted falls in the same reasoning-class family; revisit if that changes.

// ---------------------------------------------------------------------------
// Structured output schema
//
// Distinct from `WebsiteAssessmentSchema` (domain/schemas) — that one
// validates the *stored* record (includes `schemaVersion`/`generatedAt`,
// which are code-computed, never model output). OpenAI's strict structured-
// output mode requires every property to be required (no `.optional()`),
// which the model-output shape already satisfies.
// ---------------------------------------------------------------------------

const CategoryOutputSchema = z.object({
  score: z.number().int().min(0).max(100),
  explanation: z.string().min(1).max(500),
  suggestedImprovement: z.string().min(1).max(500),
});

const categoryOutputShape = Object.fromEntries(
  ASSESSMENT_CATEGORIES.map((category) => [category, CategoryOutputSchema]),
) as Record<(typeof ASSESSMENT_CATEGORIES)[number], typeof CategoryOutputSchema>;

const AssessmentOutputSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  confidence: z.enum(CONFIDENCE_LEVELS),
  leadPriority: z.enum(LEAD_PRIORITIES),
  qualification: z.enum(QUALIFICATION_RESULTS),
  categories: z.object(categoryOutputShape),
  strengths: z.array(z.string().min(1).max(300)).max(10),
  weaknesses: z.array(z.string().min(1).max(300)).max(10),
  missingOpportunities: z.array(z.string().min(1).max(100)).max(15),
  executiveSummary: z.string().min(1).max(1500),
  topProblems: z.array(z.string().min(1).max(300)).max(10),
});

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

const GUARDRAILS = [
  'Base every judgment only on the evidence provided below — crawled page content, the screenshots, and the listed metrics.',
  'Never invent business facts (certifications, years in business, awards, guarantees, reviews content) that are not present in the evidence.',
  'If evidence is missing for a category, say so in that category\'s explanation rather than guessing a score with unwarranted confidence.',
  'This assessment is an internal sales-prioritization tool, not a public review — write for an internal admin audience.',
].join('\n');

function formatMetrics(metrics: WebsiteDeterministicMetrics): string {
  const lines: string[] = [
    `Website exists: ${metrics.websiteExists}`,
    `HTTPS enabled: ${metrics.httpsEnabled}`,
    `Crawl succeeded: ${metrics.crawlSucceeded}`,
    `Desktop screenshot captured: ${metrics.desktopScreenshotCaptured}`,
    `Mobile screenshot captured: ${metrics.mobileScreenshotCaptured}`,
    `Google Places data available: ${metrics.googlePlacesDataAvailable}`,
    `Phone detected: ${metrics.phoneDetected}`,
    `Email detected: ${metrics.emailDetected}`,
    `Contact form detected: ${metrics.contactFormDetected}`,
    `Social profiles detected: ${metrics.socialProfilesDetected}`,
    `Hours detected: ${metrics.hoursDetected}`,
    `Services detected: ${metrics.servicesDetected}`,
    `Hero image available: ${metrics.heroImageAvailable}`,
  ];
  if (metrics.firecrawlExtractionConfidence !== undefined) {
    lines.push(`Crawl extraction completeness: ${metrics.firecrawlExtractionConfidence}/100`);
  }
  if (metrics.googleRating !== undefined) lines.push(`Google rating: ${metrics.googleRating}`);
  if (metrics.googleReviewCount !== undefined) lines.push(`Google review count: ${metrics.googleReviewCount}`);
  return lines.join('\n');
}

function formatSnapshot(snapshot: WebsiteEnrichmentSnapshot | undefined): string {
  if (!snapshot) return 'No crawled page content is available for this business.';
  const parts = [
    snapshot.title && `Page title: ${snapshot.title}`,
    snapshot.metaDescription && `Meta description: ${snapshot.metaDescription}`,
    snapshot.summary && `Summary: ${snapshot.summary}`,
    snapshot.about && `About text: ${snapshot.about}`,
    snapshot.services.length > 0 &&
      `Services listed:\n${snapshot.services.map((s) => `- ${s.name}${s.description ? `: ${s.description}` : ''}`).join('\n')}`,
    snapshot.serviceAreas.length > 0 && `Service areas: ${snapshot.serviceAreas.join(', ')}`,
    snapshot.differentiators.length > 0 && `Differentiators: ${snapshot.differentiators.join(', ')}`,
    snapshot.callsToAction.length > 0 && `Calls to action found: ${snapshot.callsToAction.join(', ')}`,
    snapshot.navigationLabels.length > 0 && `Navigation labels: ${snapshot.navigationLabels.join(', ')}`,
    snapshot.faq.length > 0 && `FAQ found: ${snapshot.faq.length} item(s)`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join('\n') : 'Crawl completed but returned little usable content.';
}

function buildPrompt(
  business: Business,
  snapshot: WebsiteEnrichmentSnapshot | undefined,
  metrics: WebsiteDeterministicMetrics,
): { system: string; user: string } {
  const categoryList = ASSESSMENT_CATEGORIES.join(', ');
  const locationLabel = [metrics.city, metrics.state].filter(Boolean).join(', ');

  const system = [
    'You are a website-quality analyst scoring a local business\'s existing website for a sales-prioritization tool.',
    `Score each of these categories from 0-100 with an explanation and a suggested improvement: ${categoryList}.`,
    'Also return an overall score, a confidence level, a lead priority, a qualification recommendation, strengths, weaknesses, missing opportunities, an executive summary, and top problems.',
    GUARDRAILS,
  ].join('\n\n');

  const user = [
    `Business: ${business.name}`,
    `Industry: ${business.industry.replace(/_/g, ' ')}`,
    locationLabel && `Location: ${locationLabel}`,
    `Website URL: ${business.websiteUrl ?? 'none on file'}`,
    '--- Deterministic metrics ---',
    formatMetrics(metrics),
    '--- Crawled page content ---',
    formatSnapshot(snapshot),
    'Two screenshots of the existing site may be attached below (desktop, then mobile) — use them for the visual-design, mobile-friendliness, branding, and trust judgments when present.',
  ]
    .filter(Boolean)
    .join('\n\n');

  return { system, user };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface ScoreWebsiteInput {
  business: Business;
  snapshot?: WebsiteEnrichmentSnapshot;
  metrics: WebsiteDeterministicMetrics;
  /** Short-lived signed S3 URLs — never the raw storage key. */
  screenshots?: { desktopUrl?: string; mobileUrl?: string };
}

export interface ScoredWebsite {
  assessment: WebsiteAssessment;
  /** The unvalidated model output, exactly as returned — for the raw-response S3 artifact only, never read back into the app. */
  raw: unknown;
  metadata: { model: string; promptVersion: string; durationMs: number };
}

/**
 * Scores one business's existing website. Throws on any OpenAI-level
 * failure or schema-validation failure — callers (`lib/scoring/
 * score-business.ts`) are responsible for catching and mapping to a
 * `ScanFailureCategory`, exactly like `generatePreviewContent`'s contract.
 */
export async function scoreWebsite({ business, snapshot, metrics, screenshots }: ScoreWebsiteInput): Promise<ScoredWebsite> {
  const model = getOpenAiScoringModel();
  const client = await getOpenAiClient();
  const { system, user } = buildPrompt(business, snapshot, metrics);
  const startedAt = Date.now();

  const imageParts: ChatCompletionContentPart[] = [];
  if (screenshots?.desktopUrl) {
    imageParts.push({ type: 'image_url', image_url: { url: screenshots.desktopUrl } });
  }
  if (screenshots?.mobileUrl) {
    imageParts.push({ type: 'image_url', image_url: { url: screenshots.mobileUrl } });
  }

  const completion = await client.chat.completions.parse({
    model,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: imageParts.length > 0 ? [{ type: 'text', text: user }, ...imageParts] : user,
      },
    ],
    response_format: zodResponseFormat(AssessmentOutputSchema, RESPONSE_FORMAT_NAME),
  });

  const output = completion.choices[0]?.message.parsed;
  if (!output) {
    throw new Error('OpenAI returned no parsable structured output.');
  }

  const durationMs = Date.now() - startedAt;
  const generatedAt = new Date().toISOString();

  const assessment: WebsiteAssessment = {
    schemaVersion: WEBSITE_ASSESSMENT_SCHEMA_VERSION,
    ...output,
    generatedAt,
  };

  // Defense in depth — never persist output that didn't pass the model's own
  // schema even if a future prompt/version drifts from WebsiteAssessmentSchema.
  WebsiteAssessmentSchema.parse(assessment);

  return {
    assessment,
    raw: output,
    metadata: { model, promptVersion: SCORING_PROMPT_VERSION, durationMs },
  };
}
