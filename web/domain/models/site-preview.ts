import type { ThemeName } from '@/domain/constants/themes';
import type { SocialPlatform } from '@/domain/constants/social-platforms';
import type { MutableTimestampedRecord } from './common';

// ---------------------------------------------------------------------------
// Status enum
// ---------------------------------------------------------------------------

export const SITE_PREVIEW_STATUSES = ['draft', 'ready', 'published', 'archived'] as const;
export type SitePreviewStatus = (typeof SITE_PREVIEW_STATUSES)[number];

// ---------------------------------------------------------------------------
// Structured content sub-types
// ---------------------------------------------------------------------------

/**
 * Above-the-fold hero copy.  Validated against strict length limits so
 * AI-generated text cannot exceed reasonable bounds.
 */
export interface PreviewHero {
  headline: string;
  subheadline: string;
  ctaText: string;
}

/** A single offered service shown in the services section. */
export interface PreviewService {
  name: string;
  description: string;
}

/**
 * A single social/review-platform profile link, classified by hostname
 * (`lib/social-links.ts`) so the Social Links section can render the right
 * icon. Sourced from `Business.socialLinks` (admin-entered, wins when
 * present) or, absent that, Firecrawl's normalized enrichment snapshot
 * (`WebsiteEnrichmentSnapshot.socialLinks`, Stage 13) — see
 * `generatePreviewContent` in `lib/ai/generate-preview.ts` for the merge.
 * Not directly hand-editable on the `SitePreview` itself (no inline content
 * editor — see `SectionConfigForm.tsx`'s `NO_EDITOR_SECTIONS`), so a link
 * presented as a business's official profile is always either admin-entered
 * on `Business` or evidence-sourced from a real scrape, never typed
 * mid-preview to look like a verified link.
 */
export interface PreviewSocialLink {
  platform: SocialPlatform;
  url: string;
}

/** Contact details surfaced on the preview. */
export interface PreviewContact {
  phone?: string;
  email?: string;
  /** Formatted address string for display. */
  address?: string;
}

// ---------------------------------------------------------------------------
// Call-to-action configuration
// ---------------------------------------------------------------------------

/**
 * Admin-editable headline/subheadline override for a section whose heading
 * copy was previously a hardcoded literal in its template component (e.g.
 * `ServicesGrid`'s "Our Services" / "Professional work, done right"). Both
 * fields are optional — absence means "keep the component's built-in
 * default copy", so no backfill is required for previews saved before these
 * fields existed.
 */
export interface SectionHeading {
  headline?: string;
  subheadline?: string;
}

/** A single curated gallery photo. `url` must be one of the business's uploaded `photoUrls`. */
export interface GalleryImage {
  url: string;
  caption?: string;
}

export const CTA_ACTION_TYPES = ['phone', 'email', 'sms', 'external_url', 'none'] as const;
export type CtaActionType = (typeof CTA_ACTION_TYPES)[number];

/**
 * A single configurable call-to-action button.
 *
 * `value` is an optional destination override:
 * - `phone` / `sms`: overrides `contact.phone` when present.
 * - `email`: overrides `contact.email` when present.
 * - `external_url`: required — the destination the button links to
 *   (a client's existing quote form, booking page, Calendly, etc).
 * - `none`: not rendered; `value` is unused.
 */
export interface PreviewCta {
  type: CtaActionType;
  label: string;
  value?: string;
}

/** The full CTA configuration for a preview: one required primary action, one optional secondary. */
export interface PreviewCtaConfig {
  primary: PreviewCta;
  secondary?: PreviewCta;
}

/**
 * The complete structured content of a website preview.
 *
 * Every field is explicitly typed — there are no arbitrary or open-ended
 * keys.  Any AI-generated content MUST be validated against this shape
 * (via `PreviewContentSchema`) before being stored or returned.
 */
export interface PreviewContent {
  hero: PreviewHero;
  /** 1–10 services offered by the business. */
  services: PreviewService[];
  tagline: string;
  aboutText: string;
  contact: PreviewContact;
  /** Cities and regions the business serves. Rendered when present. */
  serviceAreas?: string[];
  /**
   * "Why choose us" differentiators shown in the WhyChooseUs section.
   * Each entry has a short title and a one-sentence description.
   * Do not include invented credentials, guarantees, or statistics.
   */
  differentiators?: { title: string; description: string }[];
  /** Business hours as a single formatted display string, e.g. "Mon–Fri 8am–6pm, Sat 9am–2pm". */
  hours?: string;
  /**
   * Social/review-platform profile links found on the business's own
   * website (Stage 13 Firecrawl enrichment only — no manual admin-entry
   * path, same "evidence, not hand-typed" treatment as Reviews). Absent
   * for previews with no enrichment source or no social links found.
   */
  socialLinks?: PreviewSocialLink[];
  /** Search-engine metadata. Falls back to business-name-derived defaults when absent. */
  seo?: {
    title: string;
    description: string;
  };
  /**
   * Configurable CTA buttons rendered across the template.
   *
   * Optional for backward compatibility with previews saved before this
   * field existed — absence means "derive one from `hero.ctaText` and
   * `contact` at render time" (see `resolvePreviewCtaConfig`). New saves
   * should always populate this.
   */
  cta?: PreviewCtaConfig;

  // -------------------------------------------------------------------------
  // Per-section heading overrides (inline admin content editing)
  //
  // Every field below is optional and additive — a section with no override
  // stored renders its existing hardcoded default copy exactly as before.
  // These let an admin hand-edit the heading/body copy of a section whose
  // text was previously not sourced from any field at all.
  // -------------------------------------------------------------------------

  /** Services section heading override (default: "Our Services" / "Professional work, done right"). */
  servicesSection?: SectionHeading;
  /** Why Choose Us section heading override (default: "Why Choose Us" / "The experience your property deserves"). */
  whyChooseUsSection?: SectionHeading;
  /**
   * The decorative photo-panel quote shown in the About section. `tagline`
   * already serves as this section's editable headline, so only the quote
   * needs a new field here.
   */
  aboutSection?: { quote?: string };
  /** Service Areas section heading override (default: "Coverage" / "Areas We Serve"). */
  serviceAreasSection?: SectionHeading;
  /**
   * Gallery section heading override plus the curated photo list. Absent
   * `images` normalizes at render time to every uploaded `Business.photoUrls`
   * entry with no caption — identical to today's behavior.
   */
  gallerySection?: SectionHeading & { images?: GalleryImage[] };
  /** CTA Banner section heading override (default: "Ready for a fix? Let's talk." / "Schedule service today..."). */
  ctaBannerSection?: SectionHeading;
}

export const HERO_STYLES = ['image', 'imageSplit', 'illustration', 'gradient', 'pattern', 'solid'] as const;
export type HeroStyle = (typeof HERO_STYLES)[number];

/**
 * Visual appearance tokens applied to the preview template.
 *
 * Brand Theme System (2026-07-14): colors are never invented by AI or
 * free-typed by an admin. `themeName` selects one of the curated presets in
 * `lib/themes.ts` — that file is the only source of the actual hex values.
 */
export interface PreviewTheme {
  /**
   * The curated preset this preview uses. Required for every preview
   * created after the Brand Theme System — see `lib/theme/select-theme.ts`
   * for how it's chosen (existing logo color, stored business preference,
   * or an AI pick constrained to this enum).
   */
  themeName?: ThemeName;
  /**
   * @deprecated Free-form hex colors from previews generated before the
   * curated preset system. Only ever present on legacy records — new saves
   * must set `themeName` instead, never these. Read via
   * `resolveThemePalette()`, never directly.
   */
  primaryColor?: string;
  /** @deprecated See `primaryColor`. */
  accentColor?: string;
  fontFamily: string;
  /** URL of the hero section background image. Uses a gradient fallback when absent. */
  heroImageUrl?: string;
  /**
   * Optional mobile-only hero photo, independent of `heroImageUrl`/`heroStyle`
   * (both desktop-oriented — see `heroStyle`'s doc comment below). Unset
   * always falls back to the theme illustration on mobile, exactly as
   * before this field existed; set from `Business.heroPhotoUrlMobile` at
   * generation time (`lib/ai/generate-preview.ts`), manual-only — no
   * automatic upload-order assignment, unlike the desktop slots.
   */
  heroImageUrlMobile?: string;
  /**
   * URL of the WhyChooseUs section image. Name predates that component's
   * current title — kept as-is to avoid another breaking rename; see
   * `aboutSectionImageUrl` for the image actually shown in the AboutSection
   * (titled "About Us").
   */
  aboutImageUrl?: string;
  /** URL of the image shown in the AboutSection (titled "About Us"). */
  aboutSectionImageUrl?: string;
  /** URL of the featured-service-card background image. Falls back to a DEV_FIXTURE placeholder when absent. */
  servicesImageUrl?: string;
  /**
   * Hero presentation style. Never AI-chosen — code decides between
   * `'image'` and `'imageSplit'` whenever a hero photo resolves, based on
   * its actual pixel dimensions (`lib/image/hero-dimensions.ts`):
   * `'image'` (full-bleed background, desktop only — see below) only when
   * the photo is exactly 1920×1080 or 1600×900px; `'imageSplit'` (a
   * two-column split, real photo on the right, desktop only) for any other
   * size. `'illustration'` (a theme-matched static graphic, see
   * `template/hero-illustrations.ts`) is used whenever no hero photo
   * resolves at all. On mobile, `'image'` and `'imageSplit'` both render the
   * theme illustration by default, same as `'illustration'` — unless
   * `heroImageUrlMobile` (above) is set, in which case that photo renders
   * on mobile instead, independent of whatever this field resolved for
   * desktop. `gradient`/`pattern`/`solid` are legacy values
   * only — no new preview generates them, but previews saved before
   * `'illustration'` existed keep rendering with them unchanged (at every
   * viewport size, exactly as before this hero-dimension-classification
   * work). Optional for backward compatibility — previews saved before
   * `heroStyle` existed at all are inferred as `'image'` when
   * `heroImageUrl` is set, else `'illustration'` (see `GeneratedHero.tsx`).
   */
  heroStyle?: HeroStyle;
}

/**
 * What produced this preview's content. `'seed'` (the free, non-AI seed
 * generator) never actually attaches `GenerationMetadata` today — it's
 * listed here for completeness since it's a legitimate future source, not
 * because any current write path sets it. Optional for backward
 * compatibility with previews saved before Stage 13 introduced this field.
 */
export const GENERATION_SOURCES = ['seed', 'manual_ai', 'firecrawl_enriched'] as const;
export type GenerationSource = (typeof GENERATION_SOURCES)[number];

/** Metadata about the generation run that produced this preview. */
export interface GenerationMetadata {
  /** Model identifier, e.g. `gpt-4o`. */
  model: string;
  /** Prompt template version used. */
  promptVersion: string;
  /** ISO 8601 timestamp of when generation completed. */
  generatedAt: string;
  /** Wall-clock milliseconds the generation took. */
  durationMs: number;
  /** Optional for backward compatibility — new saves always set it. */
  source?: GenerationSource;
  /** The ScanEvent that supplied enrichment context, when `source` is `'firecrawl_enriched'`. */
  scanId?: string;
}

// ---------------------------------------------------------------------------
// SitePreview record
// ---------------------------------------------------------------------------

/**
 * A versioned snapshot of a generated website preview.
 *
 * Versioning rules:
 * - Each regeneration MUST create a new `previewId` and increment `version`.
 * - Older previews are never overwritten.
 * - The factory enforces this: callers pass `previousVersion` and receive
 *   a new record with `version = previousVersion + 1`.
 */
export interface SitePreview extends MutableTimestampedRecord {
  /** Globally unique identifier.  Format: `preview_<uuid>` */
  previewId: string;
  businessId: string;
  /** URL-safe slug for this preview. */
  slug: string;
  /**
   * Monotonically increasing version number.
   * Starts at 1 for the first preview of any business.
   */
  version: number;
  status: SitePreviewStatus;
  templateId: string;
  content: PreviewContent;
  theme: PreviewTheme;
  generationMetadata?: GenerationMetadata;
}
