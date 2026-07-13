import { z } from 'zod';
import { SITE_PREVIEW_STATUSES, CTA_ACTION_TYPES } from '@/domain/models/site-preview';
import { IsoTimestampSchema } from './common.schema';

/**
 * True only for a well-formed `https://` URL. Used to gate `external_url`
 * CTA destinations — rejects `http:`, `javascript:`, `data:`, and any other
 * unsafe or non-HTTPS protocol. Exported so render-time CTA resolution can
 * apply the same check to data that predates this validation.
 */
export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

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
 * A single configurable CTA button. `label` is required unless `type` is
 * `none` (an unrendered CTA has nothing to label). `external_url` CTAs must
 * carry a safe `https://` `value` — every other type resolves its
 * destination from `contact` at render time unless `value` overrides it.
 */
const PreviewCtaSchema = z
  .object({
    type: z.enum(CTA_ACTION_TYPES),
    label: z.string().max(40),
    value: z.string().max(500).optional(),
  })
  .refine((cta) => cta.type === 'none' || cta.label.trim().length > 0, {
    message: 'label is required unless type is "none"',
    path: ['label'],
  })
  .refine((cta) => cta.type !== 'external_url' || (!!cta.value && isHttpsUrl(cta.value)), {
    message: 'external_url requires a valid https:// value',
    path: ['value'],
  });

const PreviewCtaConfigSchema = z.object({
  primary: PreviewCtaSchema,
  secondary: PreviewCtaSchema.optional(),
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
  serviceAreas: z.array(z.string().min(1).max(80)).max(10).optional(),
  differentiators: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        description: z.string().min(1).max(300),
      }),
    )
    .max(8)
    .optional(),
  hours: z.string().max(200).optional(),
  cta: PreviewCtaConfigSchema.optional(),
});

const PreviewThemeSchema = z.object({
  /** Six-digit CSS hex color, e.g. `#11455E`. */
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fontFamily: z.string().min(1),
  heroImageUrl: z.string().url().optional(),
  aboutImageUrl: z.string().url().optional(),
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
