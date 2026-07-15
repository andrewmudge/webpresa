import type { Industry } from '@/domain/constants/industries';
import type { BrandTone } from '@/domain/constants/brand-tone';
import type { ThemeName } from '@/domain/constants/themes';
import type { Address, MutableTimestampedRecord } from './common';
import type { WebsiteSectionsConfig } from './website-sections';

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

export const BUSINESS_SOURCES = ['scan', 'manual', 'import'] as const;
export type BusinessSource = (typeof BUSINESS_SOURCES)[number];

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
}
