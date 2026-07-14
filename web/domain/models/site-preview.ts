import type { ThemeName } from '@/domain/constants/themes';
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
}

export const HERO_STYLES = ['image', 'gradient', 'pattern', 'solid'] as const;
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
  /** URL of the about/why-choose-us section image. */
  aboutImageUrl?: string;
  /** URL of the featured-service-card background image. Falls back to a DEV_FIXTURE placeholder when absent. */
  servicesImageUrl?: string;
  /**
   * Hero presentation style. Optional for backward compatibility — legacy
   * previews without this field are inferred as `'image'` when
   * `heroImageUrl` is set, else `'solid'` (see `GeneratedHero.tsx`).
   */
  heroStyle?: HeroStyle;
}

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
