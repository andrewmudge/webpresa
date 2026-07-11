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
}

/** Visual appearance tokens applied to the preview template. */
export interface PreviewTheme {
  /** CSS hex color string, e.g. `#11455E`. */
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
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
