import 'server-only';
import { getBusinessById, updateBusiness } from '@/lib/db/businesses';
import { listPreviewsForBusiness, putSitePreview } from '@/lib/db/site-previews';
import { createSitePreview } from '@/domain/factories/site-preview.factory';
import { generatePreviewContent } from './generate-preview';

/**
 * The Stage 11 "Generate Website" pipeline (metrics → OpenAI → persist),
 * extracted from `businesses/[businessId]/actions.ts`'s `runWebsiteGeneration`
 * so Stage 16's no-website workflow branch can call the exact same,
 * already-tested logic — neither Stage 13's no-website path nor Stage 15's
 * no-website qualification shortcut generates a preview; this is the only
 * place that does, for a business with no website to crawl. The admin
 * "Generate Website" button (`generateWebsiteAction`/`finishOnboardingAction`)
 * and the new `/api/internal/scan/generate-preview` route both call this.
 */

/** Soft cap on real OpenAI generations per business. `businesses/page.tsx`'s onboarding wizard hardcodes this same value — kept in sync by comment there. */
export const MAX_AI_GENERATIONS = 10;

export interface GenerateAndSaveWebsiteOutcome {
  status: 'completed' | 'not_eligible' | 'failed';
  previewId?: string;
  /** Safe, admin-facing summary. */
  message?: string;
}

export async function generateAndSaveWebsite(businessId: string): Promise<GenerateAndSaveWebsiteOutcome> {
  const business = await getBusinessById(businessId);
  if (!business) return { status: 'failed', message: 'Business not found.' };

  if (!business.servicesOffered?.trim()) {
    return { status: 'not_eligible', message: 'Add at least one service under "Services offered" before generating a website.' };
  }

  const existing = await listPreviewsForBusiness(businessId);
  const priorGenerations = existing.filter((p) => p.generationMetadata).length;
  if (priorGenerations >= MAX_AI_GENERATIONS) {
    return { status: 'not_eligible', message: `This business has reached the limit of ${MAX_AI_GENERATIONS} AI-generated websites.` };
  }
  const previousVersion = existing.length > 0 ? Math.max(...existing.map((p) => p.version)) : 0;

  try {
    const { content, theme, metadata } = await generatePreviewContent(business);

    const preview = createSitePreview({
      businessId: business.businessId,
      slug: business.slug,
      templateId: 'local-business-v1',
      content,
      theme,
      generationMetadata: metadata,
      previousVersion,
    });

    // Status stays the factory default ('draft') — generated websites always
    // require admin review before publication, never auto-published.
    await putSitePreview(preview);

    // Brand Theme System Step 3 — persist the resolved theme so every future
    // regeneration reuses it instead of re-deriving it.
    if (!business.theme && theme.themeName) {
      await updateBusiness(business.businessId, { theme: theme.themeName });
    }
    // Same durability rule for CTA — see the `Business.cta` doc comment.
    if (!business.cta) {
      await updateBusiness(business.businessId, { cta: content.cta });
    }

    return { status: 'completed', previewId: preview.previewId };
  } catch (err) {
    console.error('Failed to generate website:', err instanceof Error ? err.message : err);
    return { status: 'failed', message: 'Failed to generate website. Please try again.' };
  }
}
