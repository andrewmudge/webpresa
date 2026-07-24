// ---------------------------------------------------------------------------
// AI website assessment (Stage 15 — AI Prospect Qualification & Website
// Analysis)
//
// The validated, structured output of one AI scoring attempt against a
// business's existing website, plus the deterministic (non-AI) metrics
// computed alongside it. Mirrors the `WebsiteEnrichmentSnapshot` precedent
// (Stage 13) — this is the only shape of AI-scoring data that ever gets
// stored on `ScanEvent.assessment` or fed back to an admin; the raw model
// response is preserved separately as an S3 artifact
// (`ScanEvent.aiResponseArtifactKey`), never trusted or displayed directly.
// See implementation.md, Stage 15.
// ---------------------------------------------------------------------------

export const WEBSITE_ASSESSMENT_SCHEMA_VERSION = '1' as const;

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const LEAD_PRIORITIES = ['high', 'medium', 'low'] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

/**
 * The AI's own recommendation. `Business.qualification` (the field an admin
 * and the rest of the app actually read) is derived from this by applying
 * the deterministic overrides in `lib/scoring/qualification-rules.ts` — the
 * two are not always equal. See implementation.md, Stage 15, "Qualification
 * rules".
 */
export const QUALIFICATION_RESULTS = ['qualified', 'manual_review', 'reject'] as const;
export type QualificationResult = (typeof QUALIFICATION_RESULTS)[number];

/**
 * The 12 categories scored on every assessment — see implementation.md,
 * Stage 15, "AI scoring categories". Keys are camelCase for direct use as a
 * Zod/TypeScript record key; display labels live in the admin UI, not here.
 */
export const ASSESSMENT_CATEGORIES = [
  'mobileFriendliness',
  'visualDesign',
  'branding',
  'professionalism',
  'trust',
  'callsToAction',
  'leadGeneration',
  'localSeo',
  'serviceClarity',
  'contentQuality',
  'accessibility',
  'overallUserExperience',
] as const;
export type AssessmentCategory = (typeof ASSESSMENT_CATEGORIES)[number];

export interface WebsiteCategoryAssessment {
  /** 0-100. */
  score: number;
  explanation: string;
  suggestedImprovement: string;
}

export type WebsiteAssessmentCategories = Record<AssessmentCategory, WebsiteCategoryAssessment>;

/**
 * Deterministic (non-AI) signals computed by the application from already-
 * persisted data and included as grounding context in the AI prompt — never
 * produced by the model. See implementation.md, Stage 15, "Deterministic
 * metrics", and `lib/scoring/deterministic-metrics.ts`.
 *
 * Several fields are heuristic, computed-from-what's-available approximations
 * rather than a direct provider-reported value — documented at each such
 * field, since no first-class signal exists for it yet (e.g. Firecrawl
 * reports no confidence score of its own; hours are never persisted on
 * `Business`, see Stage 12's "review context only — never persisted" note).
 */
export interface WebsiteDeterministicMetrics {
  websiteExists: boolean;
  httpsEnabled: boolean;
  crawlSucceeded: boolean;
  desktopScreenshotCaptured: boolean;
  mobileScreenshotCaptured: boolean;
  /** Heuristic completeness score (0-100) from how many snapshot fields Firecrawl actually populated — Firecrawl itself reports no confidence value. */
  firecrawlExtractionConfidence?: number;
  googlePlacesDataAvailable: boolean;
  businessCategory: string;
  city?: string;
  state?: string;
  phoneDetected: boolean;
  emailDetected: boolean;
  /** Heuristic — a "contact"-labeled link/CTA found during enrichment; no dedicated form-detection signal exists. */
  contactFormDetected: boolean;
  googleRating?: number;
  googleReviewCount?: number;
  socialProfilesDetected: boolean;
  /** Heuristic — a time-of-day pattern found in scraped page text; `Business` never persists structured hours (Stage 12). */
  hoursDetected: boolean;
  servicesDetected: boolean;
  heroImageAvailable: boolean;
}

/**
 * The full validated AI assessment for one scoring attempt.
 */
export interface WebsiteAssessment {
  schemaVersion: typeof WEBSITE_ASSESSMENT_SCHEMA_VERSION;
  overallScore: number;
  confidence: ConfidenceLevel;
  leadPriority: LeadPriority;
  /** The AI's own recommendation — see `QualificationResult`'s doc comment. */
  qualification: QualificationResult;
  categories: WebsiteAssessmentCategories;
  strengths: string[];
  weaknesses: string[];
  missingOpportunities: string[];
  executiveSummary: string;
  topProblems: string[];
  generatedAt: string;
}
