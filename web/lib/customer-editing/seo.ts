import 'server-only';
import type { PreviewContent } from '@/domain/models/site-preview';
import { PreviewContentSchema } from '@/domain/schemas/site-preview.schema';
import { ensureDraftPreview, putSitePreview } from '@/lib/db/site-previews';

/**
 * SEO title/description editor — new for Stage 19 (no admin equivalent
 * exists today; `PreviewContent.seo` has never had a dedicated editor
 * before this). Same direct-patch-onto-a-draft pattern as every other
 * section content editor in this module.
 */
export type CustomerSeoState = { message?: string } | undefined;

export async function updateCustomerSeo(businessId: string, formData: FormData): Promise<CustomerSeoState> {
  const title = ((formData.get('seoTitle') as string | null) ?? '').trim();
  const description = ((formData.get('seoDescription') as string | null) ?? '').trim();

  try {
    const draft = await ensureDraftPreview(businessId);
    if (!draft) return { message: 'No website exists yet to edit.' };

    const content: PreviewContent = {
      ...draft.content,
      seo: title && description ? { title: title.slice(0, 70), description: description.slice(0, 200) } : undefined,
    };
    PreviewContentSchema.parse(content);
    await putSitePreview({ ...draft, content, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Failed to update customer SEO:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save changes. Please try again.' };
  }

  return undefined;
}
