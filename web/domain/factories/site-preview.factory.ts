import type { SitePreview, PreviewContent, PreviewTheme, GenerationMetadata } from '@/domain/models/site-preview';
import { SitePreviewSchema } from '@/domain/schemas/site-preview.schema';
import { generateId, nowIso } from './utils';

export interface CreateSitePreviewInput {
  businessId: string;
  /** Provide a slug or one is derived from businessId. */
  slug?: string;
  templateId: string;
  /**
   * Must already be validated against `PreviewContentSchema` by the caller,
   * but `createSitePreview` will re-validate via `SitePreviewSchema.parse()`.
   */
  content: PreviewContent;
  theme: PreviewTheme;
  generationMetadata?: GenerationMetadata;
  /**
   * The `version` field of the most recent existing preview for this business,
   * or `undefined` / `0` when creating the first preview.
   *
   * The factory sets `version = previousVersion + 1`, ensuring each call
   * produces a new record that is strictly newer than the previous one.
   * Never pass the same `previousVersion` twice for the same business
   * without persisting the intermediate record.
   */
  previousVersion?: number;
}

/**
 * Create a new SitePreview record.
 *
 * Versioning guarantee: every call generates a new `previewId` and
 * increments `version`.  Existing previews are never overwritten —
 * history is preserved by always creating a new record.
 *
 * The record is validated against `SitePreviewSchema` before being
 * returned — malformed content will throw a ZodError.
 */
export function createSitePreview(input: CreateSitePreviewInput): SitePreview {
  const now = nowIso();

  const record: SitePreview = {
    previewId: generateId('preview_'),
    businessId: input.businessId,
    slug: input.slug ?? deriveSlug(input.businessId),
    version: (input.previousVersion ?? 0) + 1,
    status: 'draft',
    templateId: input.templateId,
    content: input.content,
    theme: input.theme,
    ...(input.generationMetadata !== undefined && {
      generationMetadata: input.generationMetadata,
    }),
    createdAt: now,
    updatedAt: now,
  };

  SitePreviewSchema.parse(record);
  return record;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Derive a preview slug from the business ID when none is supplied.
 * Strips the `biz_` prefix and truncates the UUID to a short token.
 */
function deriveSlug(businessId: string): string {
  const uuid = businessId.replace(/^biz_/, '');
  return `preview-${uuid.slice(0, 8)}`;
}
