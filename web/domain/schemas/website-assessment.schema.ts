import { z } from 'zod';
import {
  WEBSITE_ASSESSMENT_SCHEMA_VERSION,
  CONFIDENCE_LEVELS,
  LEAD_PRIORITIES,
  QUALIFICATION_RESULTS,
  ASSESSMENT_CATEGORIES,
} from '@/domain/models/website-assessment';
import { IsoTimestampSchema, ScoreSchema } from './common.schema';

/**
 * Runtime validation for the deterministic (non-AI) metrics computed by
 * `lib/scoring/deterministic-metrics.ts`.
 */
export const WebsiteDeterministicMetricsSchema = z.object({
  websiteExists: z.boolean(),
  httpsEnabled: z.boolean(),
  crawlSucceeded: z.boolean(),
  desktopScreenshotCaptured: z.boolean(),
  mobileScreenshotCaptured: z.boolean(),
  firecrawlExtractionConfidence: ScoreSchema.optional(),
  googlePlacesDataAvailable: z.boolean(),
  businessCategory: z.string().min(1).max(100),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  phoneDetected: z.boolean(),
  emailDetected: z.boolean(),
  contactFormDetected: z.boolean(),
  googleRating: z.number().min(0).max(5).optional(),
  googleReviewCount: z.number().int().min(0).optional(),
  socialProfilesDetected: z.boolean(),
  hoursDetected: z.boolean(),
  servicesDetected: z.boolean(),
  heroImageAvailable: z.boolean(),
});

const WebsiteCategoryAssessmentSchema = z.object({
  score: ScoreSchema,
  explanation: z.string().min(1).max(500),
  suggestedImprovement: z.string().min(1).max(500),
});

const categoryShape = Object.fromEntries(
  ASSESSMENT_CATEGORIES.map((category) => [category, WebsiteCategoryAssessmentSchema]),
) as Record<(typeof ASSESSMENT_CATEGORIES)[number], typeof WebsiteCategoryAssessmentSchema>;

export const WebsiteAssessmentCategoriesSchema = z.object(categoryShape);

/**
 * Runtime validation for the full AI assessment — the defense-in-depth
 * re-validation applied after OpenAI's own structured-output enforcement,
 * same pattern as `PreviewContentSchema.parse()` in `generate-preview.ts`.
 * A failure here is what drives the `invalid_ai_schema_output` failure
 * category (see `lib/ai/score-website.ts`).
 */
export const WebsiteAssessmentSchema = z.object({
  schemaVersion: z.literal(WEBSITE_ASSESSMENT_SCHEMA_VERSION),
  overallScore: ScoreSchema,
  confidence: z.enum(CONFIDENCE_LEVELS),
  leadPriority: z.enum(LEAD_PRIORITIES),
  qualification: z.enum(QUALIFICATION_RESULTS),
  categories: WebsiteAssessmentCategoriesSchema,
  strengths: z.array(z.string().min(1).max(300)).max(10),
  weaknesses: z.array(z.string().min(1).max(300)).max(10),
  missingOpportunities: z.array(z.string().min(1).max(100)).max(15),
  executiveSummary: z.string().min(1).max(1500),
  topProblems: z.array(z.string().min(1).max(300)).max(10),
  generatedAt: IsoTimestampSchema,
});
