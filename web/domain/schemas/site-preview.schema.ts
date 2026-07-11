import { z } from 'zod';
import { SITE_PREVIEW_STATUSES } from '@/domain/models/site-preview';
import { IsoTimestampSchema } from './common.schema';

// ---------------------------------------------------------------------------
// Nested content schemas
// ---------------------------------------------------------------------------

/**
 * Hero copy validated with explicit length limits.
 * AI-generated values that exceed these bounds are rejected at parse time.
 */
const PreviewHeroSchema = z.object({
  headline: z.string().min(1).max(120),
  subheadline: z.string().min(1).max(300),
  ctaText: z.string().min(1).max(50),
});

const PreviewServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
});

const PreviewContactSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().max(300).optional(),
});

/**
 * The canonical content schema for a website preview.
 *
 * This schema is the enforcement point for all AI-generated text.
 * Unstructured output, unexpected keys, or values that exceed length
 * limits will cause `parse()` to throw.  Never store raw AI output
 * without validating through this schema first.
 */
export const PreviewContentSchema = z.object({
  hero: PreviewHeroSchema,
  services: z.array(PreviewServiceSchema).min(1).max(10),
  tagline: z.string().min(1).max(200),
  aboutText: z.string().min(1).max(2000),
  contact: PreviewContactSchema,
});

const PreviewThemeSchema = z.object({
  /** Six-digit CSS hex color, e.g. `#11455E`. */
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fontFamily: z.string().min(1),
});

const GenerationMetadataSchema = z.object({
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  generatedAt: IsoTimestampSchema,
  durationMs: z.number().int().min(0),
});

// ---------------------------------------------------------------------------
// SitePreview schema
// ---------------------------------------------------------------------------

export const SitePreviewSchema = z.object({
  previewId: z
    .string()
    .regex(/^preview_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
  businessId: z.string().regex(/^biz_/),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  /** Must be ≥ 1; the factory increments from the previous version. */
  version: z.number().int().min(1),
  status: z.enum(SITE_PREVIEW_STATUSES),
  templateId: z.string().min(1),
  content: PreviewContentSchema,
  theme: PreviewThemeSchema,
  generationMetadata: GenerationMetadataSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
