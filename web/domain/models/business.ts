import type { Industry } from '@/domain/constants/industries';
import type { BrandTone } from '@/domain/constants/brand-tone';
import type { ThemeName } from '@/domain/constants/themes';
import type { Address, MutableTimestampedRecord } from './common';
import type { WebsiteSectionsConfig } from './website-sections';
import type { PreviewCtaConfig } from './site-preview';
import type { LeadPriority, QualificationResult } from './website-assessment';
import type { ScanWorkflowStatus } from './scan-execution';
import type { WebpresaPlan, SubscriptionStatus, BillingInterval } from '@/domain/constants/plans';

// ---------------------------------------------------------------------------
// Section-eligibility content sub-types (Stage 11.x)
//
// Optional, currently unpopulated by any write path — foundation fields the
// deterministic recommendation rules and render-time availability checks
// read from (see `lib/website-sections/`). `googleRating`/`googleReviewCount`
// are the natural next fields once Stage 12 (Google Places) exists, mirroring
// how `googlePlaceId`/`googleMapsUrl` were reserved ahead of that stage.
// `faqItems`/`processSteps` are manually verified content — no code path may
// auto-generate entries for these. `testimonials` is the one deliberate
// exception (Stage 12 follow-on, see `lib/google-places/reviews.ts`):
// `source: 'google'` entries ARE auto-generated, from Google's own Place
// Details reviews (capped at 5 per place by Google, never editable — only
// hideable — to respect Google's API terms on not altering review content).
// `source: 'manual'` entries remain fully admin-editable exactly as before.
// ---------------------------------------------------------------------------

export const TESTIMONIAL_SOURCES = ['manual', 'google'] as const;
export type TestimonialSource = (typeof TESTIMONIAL_SOURCES)[number];

export interface BusinessTestimonial {
  /** Stable identity, independent of array position — the admin-facing
   *  order editor and the Google-refresh merge both key off this rather
   *  than position, since content edits/refreshes rebuild the array.
   *  For `source: 'google'` this always equals `googleReviewId` (Google's
   *  own stable id already is one — no need for a second, separate value).
   *  For `source: 'manual'` it's a `crypto.randomUUID()` assigned once at
   *  creation and round-tripped through the admin form as a hidden field. */
  id: string;
  author: string;
  quote: string;
  source: TestimonialSource;
  /** Admin can hide a Google-sourced review from the public site without deleting it. */
  hidden?: boolean;
  /** 1–5 star rating. Always present for Google reviews; optionally
   *  admin-settable for manual testimonials too (a "Rating" dropdown in the
   *  admin form) so a manual card can render the same star row a Google
   *  card does. */
  rating?: number;
  /** Google reviewer's avatar (`authorAttribution.photoUri`) — a hotlinkable Google
   *  CDN URL, not a Google Place Photo. Google only. */
  authorPhotoUrl?: string;
  /** Google reviewer's own Maps/profile URL (`authorAttribution.uri`). Google only. */
  authorProfileUrl?: string;
  /** Google's review resource name (`review.name`) — also used as `id` (see above). Google only. */
  googleReviewId?: string;
  /** Google's relative time string, e.g. "2 months ago". Google only. */
  publishTimeDescription?: string;
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

  // -------------------------------------------------------------------------
  // AI prospect qualification disposition (Stage 15)
  //
  // A business-level, durable summary of the latest completed AI website
  // assessment — the counterpart to `ScanEvent.assessment` (the full,
  // scan-scoped detail), following the same "disposition on Business, full
  // record on ScanEvent" split `enrichmentStatus` established. Set by
  // `lib/scoring/score-business.ts` after each scoring attempt.
  //
  // `qualification`/`websiteQualityScore` are always the AI's own values —
  // never overwritten by an admin override (see `adminReviewed*` below).
  // `qualification` already reflects the deterministic overrides in
  // `lib/scoring/qualification-rules.ts` (e.g. "no website" always resolves
  // to `'qualified'`), so it is not always identical to the raw AI
  // recommendation stored in `ScanEvent.assessment.qualification`.
  // -------------------------------------------------------------------------

  qualification?: QualificationResult;
  leadPriority?: LeadPriority;
  /** Rollup of the latest assessment's `overallScore` — for admin list/filter views. Never admin-editable directly; see `adminReviewedScore`. */
  websiteQualityScore?: number;
  /**
   * Admin override — stored separately from `qualification`/
   * `websiteQualityScore` so the original AI assessment always remains
   * recoverable (Stage 15 acceptance criterion). When either is set, the
   * admin UI treats it as authoritative for prioritization; the AI-produced
   * fields above are left untouched.
   */
  adminReviewedQualification?: QualificationResult;
  adminReviewedScore?: number;

  // -------------------------------------------------------------------------
  // Scan workflow rollup (Stage 16)
  //
  // A denormalized pointer to this business's most recent Step Functions
  // execution — distinct from `enrichmentStatus` (Stage 13-specific, about
  // Firecrawl enrichment only). The full execution history lives on
  // `ScanExecution`; these three fields exist purely so the admin business
  // list/detail views don't need a second query to show workflow state.
  // Only ever updated through a conditional transition (see
  // `lib/db/scan-executions.ts`) so an older or duplicate execution can't
  // overwrite a newer result.
  // -------------------------------------------------------------------------

  latestScanExecutionId?: string;
  scanExecutionStatus?: ScanWorkflowStatus;
  scanExecutionUpdatedAt?: string;

  // -------------------------------------------------------------------------
  // Ownership (Stage 17 — Website Claim Flow)
  //
  // The sole ownership signal — never `status`, never any Stripe-related
  // field. `ownerUserId` is a Cognito `sub`, set only by the claim-token
  // consumption transaction (see `lib/db/claims.ts`, `consumeClaim`) or
  // cleared by the admin-only ownership-release action (`lib/db/businesses.ts`,
  // `releaseOwnership`). Absence means unclaimed. Not unique per user — one
  // customer account may own multiple Businesses (`owner-user-id-index`).
  // -------------------------------------------------------------------------

  ownerUserId?: string;
  claimedAt?: string;

  // -------------------------------------------------------------------------
  // Subscription entitlement (Stage 18 — Stripe Subscriptions)
  //
  // Business-scoped subscription state. A Stripe Subscription maps 1:1 to
  // exactly one Business — the Stripe *Customer*, by contrast, is scoped to
  // the customer (one Cognito `sub` may own several Businesses) and lives on
  // `CustomerBillingProfile`, not here; `stripeCustomerId` below is only a
  // denormalized display copy of that authoritative value.
  // -------------------------------------------------------------------------

  /** Purchased Webpresa tier. Absent = never subscribed. Never derived from
   *  a Stripe Price ID directly by any caller outside `lib/stripe/plans.ts`. */
  plan?: WebpresaPlan;
  /** Which Price ID cadence the current subscription was resolved from —
   *  sibling fact to `plan`, resolved from the same Stripe Price ID by the
   *  same webhook reconciliation step (see `resolveBillingIntervalFromPriceId`
   *  in `lib/stripe/plans.ts`). Absent for subscriptions predating this field
   *  until their next webhook event re-syncs them. */
  billingInterval?: BillingInterval;
  /** Application-owned lifecycle — the only status most of the app should
   *  ever branch on. Written exclusively by the verified webhook handler. */
  subscriptionStatus?: SubscriptionStatus;
  /** Stripe's own raw status string (e.g. 'trialing', 'incomplete', 'unpaid')
   *  — diagnostics only, never branched on outside the mapping module. */
  stripeRawStatus?: string;
  /** Stripe's current_period_end, ISO string. Drives "renews/ends on" UI copy. */
  currentPeriodEnd?: string;
  /** Mirrors Stripe's cancel_at_period_end. When true and subscriptionStatus
   *  is still 'active', the customer has scheduled cancellation but remains
   *  entitled through currentPeriodEnd — Stripe itself keeps status 'active'
   *  for the whole paid period in this case, so no separate `entitledUntil`
   *  field is needed. */
  cancelAtPeriodEnd?: boolean;
  /** Diagnostics only — recorded on every webhook reconciliation, but never
   *  gates whether a write is applied. The write itself is always an
   *  idempotent snapshot of current Stripe truth, safe to repeat and safe
   *  out of order by construction; an older duplicate event will never equal
   *  the most-recently-*stored* event ID, so these fields cannot alone
   *  provide full duplicate-event detection — that safety comes from the
   *  snapshot property of the write, not from tracking event IDs. */
  lastStripeEventId?: string;
  lastStripeEventAt?: string;
  lastStripeSyncAt?: string;
  /** A still-open Checkout Session awaiting completion, checked (via a live
   *  Stripe lookup) and reused if still open, rather than blindly trusted —
   *  replaces a coarse time-bucketed idempotency key. Cleared once the
   *  webhook activates the subscription. */
  pendingCheckoutSessionId?: string;
  pendingCheckoutExpiresAt?: string;
  /** The latest subscription-agreement acceptance — NOT a permanent legal
   *  history. Also duplicated into Checkout/Subscription metadata at
   *  acceptance time for redundant audit trail. Final legal copy and
   *  versioning are Stage 26's responsibility. */
  termsVersion?: string;
  acceptedTermsAt?: string;

  // -------------------------------------------------------------------------
  // Customer dashboard preferences (Stage 19)
  // -------------------------------------------------------------------------

  /** Undefined/true = show the "you have unpublished draft changes" toast on
   *  the customer Website editor; `false` = permanently dismissed via either
   *  the toast's own "Don't show this again" control or the Settings page's
   *  matching toggle. Deliberately NOT the same thing as the toast's
   *  per-draft "already shown once" state, which is browser-local
   *  (`localStorage`, keyed by draft `previewId`) and resets automatically on
   *  publish — this field is the durable, cross-device opt-out. */
  draftChangesNoticeEnabled?: boolean;
}
