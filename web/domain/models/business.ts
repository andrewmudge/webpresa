import type { Industry } from '@/domain/constants/industries';
import type { BrandTone } from '@/domain/constants/brand-tone';
import type { ThemeName } from '@/domain/constants/themes';
import type { Address, MutableTimestampedRecord } from './common';
import type { WebsiteSectionsConfig } from './website-sections';
import type { PreviewCtaConfig } from './site-preview';

// ---------------------------------------------------------------------------
// Section-eligibility content sub-types (Stage 11.x)
//
// Optional, currently unpopulated by any write path — foundation fields the
// deterministic recommendation rules and render-time availability checks
// read from (see `lib/website-sections/`). `googleRating`/`googleReviewCount`
// are the natural next fields once Stage 12 (Google Places) exists, mirroring
// how `googlePlaceId`/`googleMapsUrl` were reserved ahead of that stage.
// `testimonials`/`faqItems`/`processSteps` are manually verified content —
// no code path may auto-generate entries for these.
// ---------------------------------------------------------------------------

export interface BusinessTestimonial {
  author: string;
  quote: string;
}

export interface BusinessFaqItem {
  question: string;
  answer: string;
}

export interface BusinessProcessStep {
  title: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Status & source enums
// ---------------------------------------------------------------------------

export const BUSINESS_STATUSES = ['active', 'inactive', 'pending', 'archived'] as const;
export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

export const BUSINESS_SOURCES = ['scan', 'manual', 'import', 'google_places'] as const;
export type BusinessSource = (typeof BUSINESS_SOURCES)[number];

// ---------------------------------------------------------------------------
// Firecrawl enrichment disposition (Stage 13)
//
// A business-level, human-facing summary of where this business stands in
// the Firecrawl enrichment pipeline — distinct from the per-attempt
// `ScanEvent.status`. Never overloaded onto `Business.status` (the general
// lifecycle field) or `ScanEvent.status` (a single attempt's execution
// state) — see architecture.md, "Firecrawl Website Enrichment".
// ---------------------------------------------------------------------------

export const ENRICHMENT_STATUSES = [
  'not_started',
  'ready_for_enrichment',
  'enrichment_in_progress',
  'enrichment_completed',
  'enrichment_failed',
  'manual_approval_required',
] as const;
export type EnrichmentStatus = (typeof ENRICHMENT_STATUSES)[number];

export const MANUAL_APPROVAL_REASONS = [
  'missing_website',
  'no_usable_images',
  'insufficient_content',
  'other',
] as const;
export type ManualApprovalReason = (typeof MANUAL_APPROVAL_REASONS)[number];

// ---------------------------------------------------------------------------
// Sub-types
// ---------------------------------------------------------------------------

/**
 * Website quality scores, each on a 0–100 scale.
 * All fields are optional; a scan may produce a subset of scores.
 */
export interface BusinessScores {
  overall?: number;
  design?: number;
  mobile?: number;
  seo?: number;
  performance?: number;
}

// ---------------------------------------------------------------------------
// Business record
// ---------------------------------------------------------------------------

/**
 * Canonical representation of a local business in the Webpresa system.
 *
 * A Business is intentionally valid without a `websiteUrl` (a new business
 * may not have one yet) and without a `googlePlaceId` (not all businesses
 * appear on Google Maps).
 */
export interface Business extends MutableTimestampedRecord {
  /** Globally unique identifier.  Format: `biz_<uuid>` */
  businessId: string;
  /** URL-safe slug derived from the business name. */
  slug: string;
  /** Public-facing trading name. */
  name: string;
  /** Legal entity name when it differs from the trading name. */
  legalName?: string;
  industry: Industry;
  phone?: string;
  email?: string;
  /**
   * Current live website URL — optional.
   * A Business is valid without a websiteUrl.
   */
  websiteUrl?: string;
  address?: Address;
  /**
   * Google Place identifier — optional.
   * A Business is valid without a googlePlaceId.
   */
  googlePlaceId?: string;
  googleMapsUrl?: string;
  /** How this record entered the system. */
  source: BusinessSource;
  status: BusinessStatus;
  scores?: BusinessScores;
  /** ID of the most recently published SitePreview for this business. */
  currentPreviewId?: string;
  /** Stripe Customer ID — stored for billing lookups only, never a secret. */
  stripeCustomerId?: string;
  /** Active Stripe Subscription ID. */
  stripeSubscriptionId?: string;

  // -------------------------------------------------------------------------
  // Website generation inputs (Stage 11)
  //
  // Free-text fields captured on the business creation/edit form and fed to
  // the AI generation prompt — never rendered directly, so they're kept as
  // plain multi-line strings rather than structured arrays. Persisted here
  // (not ephemeral) so an admin can revisit and re-run generation later
  // without re-entering data.
  // -------------------------------------------------------------------------

  /** Multi-line free text, one service per line. */
  servicesOffered?: string;
  /** Multi-line free text, one area per line. */
  serviceAreas?: string;
  description?: string;
  /** Multi-line free text. */
  differentiators?: string;
  brandTone?: BrandTone;
  notes?: string;

  // -------------------------------------------------------------------------
  // Manual social links
  //
  // Admin-entered social/review profile URLs — the durable, business-level
  // counterpart to Firecrawl-discovered social links (see
  // `WebsiteEnrichmentSnapshot.socialLinks` and `PreviewContent.socialLinks`
  // in site-preview.ts). Whenever this is non-empty, `generatePreviewContent`
  // uses these instead of whatever Firecrawl found — the same "Business is
  // canonical" precedent every other manually-entered field already gets.
  // Persisted here (not on SitePreview) so it survives every regeneration,
  // exactly like `theme`/`cta`.
  // -------------------------------------------------------------------------

  socialLinks?: string[];

  // -------------------------------------------------------------------------
  // Uploaded assets (Stage 9 `businesses/` prefix)
  //
  // Both fields store the public `/api/assets/...` proxy URL, never a raw
  // S3 URL — the assets bucket is fully private.
  // -------------------------------------------------------------------------

  logoUrl?: string;
  photoUrls?: string[];

  // -------------------------------------------------------------------------
  // Photo slot assignment overrides
  //
  // Generation auto-assigns uploaded photos to template slots by upload
  // order (see `generatePreviewContent` in lib/ai/generate-preview.ts). Each
  // of these optionally overrides one slot: set to one of `photoUrls` to pin
  // a specific photo there, or the literal `'none'` to force that slot's
  // non-photo fallback (e.g. the hero's gradient/pattern background) even
  // though photos exist. Leaving a field unset keeps the automatic pick.
  // -------------------------------------------------------------------------

  heroPhotoUrl?: string;
  aboutPhotoUrl?: string;
  whyChooseUsPhotoUrl?: string;
  servicesPhotoUrl?: string;
  /**
   * Optional mobile-only hero photo — independent of `heroPhotoUrl` (the
   * desktop slot). Unlike the four slots above, there is no automatic
   * upload-order fallback for this one: leaving it unset always falls back
   * to the theme illustration on mobile (never an arbitrary uploaded photo
   * nobody chose for that crop), exactly as before this field existed. Set
   * to one of `photoUrls` to show a real photo on mobile, blended
   * left-to-right so the hero text stays legible (see `GeneratedHero.tsx`).
   */
  heroPhotoUrlMobile?: string;

  // -------------------------------------------------------------------------
  // Brand Theme System
  //
  // The curated theme preset (see `lib/themes.ts`) selected for this
  // business — never a raw color. Once set, every regeneration reuses it
  // (see `lib/theme/select-theme.ts`) instead of re-deriving it, unless an
  // admin explicitly picks a different preset on the business form.
  // -------------------------------------------------------------------------

  theme?: ThemeName;

  // -------------------------------------------------------------------------
  // Configurable CTA
  //
  // The resolved primary/secondary call-to-action, persisted here so it
  // survives every "Generate Website" regeneration exactly like `theme`
  // already does — an admin's CTA edit (or the first generation's own
  // AI-labeled-but-code-derived pick) is a durable business decision, not
  // AI-generated prose that's expected to reset on regeneration. Set once by
  // the first successful generation if unset, and always overwritten
  // whenever an admin explicitly edits the Preview CTA card.
  // -------------------------------------------------------------------------

  cta?: PreviewCtaConfig;

  // -------------------------------------------------------------------------
  // Section eligibility signals (Stage 11.x)
  // See the module-level comment above. Unpopulated today.
  // -------------------------------------------------------------------------

  /** Average Google rating, 0–5. Reserved for Stage 12 (Google Places). */
  googleRating?: number;
  /** Reserved for Stage 12 (Google Places). */
  googleReviewCount?: number;
  testimonials?: BusinessTestimonial[];
  faqItems?: BusinessFaqItem[];
  processSteps?: BusinessProcessStep[];

  // -------------------------------------------------------------------------
  // Configurable website sections (Stage 11.x)
  //
  // Which optional sections render on this business's generated preview,
  // and in what order. Absent for businesses created before this system —
  // the renderer and admin UI both fall back to a computed default that
  // preserves the pre-existing fixed template's appearance (see
  // `domain/factories/website-sections.factory.ts`).
  // -------------------------------------------------------------------------

  websiteSections?: WebsiteSectionsConfig;

  // -------------------------------------------------------------------------
  // Firecrawl enrichment disposition (Stage 13)
  //
  // Set by `lib/firecrawl/enrich-business.ts` after each enrichment attempt.
  // `manualApprovalReason`/`manualApprovalNote` most commonly accompany
  // `enrichmentStatus: 'manual_approval_required'` (the no-website hard
  // stop), but can also be set alongside `'enrichment_completed'` — a
  // successful text-only scrape with no usable images still flags
  // `'no_usable_images'` as a softer, non-blocking note. Never set from
  // Firecrawl-discovered content — these describe the *pipeline's* state,
  // not business facts, so they don't conflict with the "Business is
  // canonical" rule.
  // -------------------------------------------------------------------------

  enrichmentStatus?: EnrichmentStatus;
  manualApprovalReason?: ManualApprovalReason;
  /** Admin-visible explanation — see `lib/firecrawl/enrich-business.ts` for the exact required copy. */
  manualApprovalNote?: string;
}
