import 'server-only';
import { z } from 'zod';
import type { PreviewTheme } from '@/domain/models/site-preview';
import { PreviewThemeSchema } from '@/domain/schemas/site-preview.schema';
import { THEME_NAMES } from '@/domain/constants/themes';
import { getBusinessById, putBusiness } from '@/lib/db/businesses';
import { ensureDraftPreview, putSitePreview } from '@/lib/db/site-previews';

/**
 * Customer-scoped counterpart to the admin's `updateThemeAction`. Same
 * "Auto (unset) makes no live change, a specific pick applies immediately"
 * behavior, but the live-apply step lands on a draft (via
 * `ensureDraftPreview`) rather than an admin's direct patch-in-place.
 */
const UpdateThemeSchema = z.object({ theme: z.enum(THEME_NAMES).optional() });

export type CustomerThemeState = { message?: string } | undefined;

export async function updateCustomerTheme(businessId: string, formData: FormData): Promise<CustomerThemeState> {
  const parsed = UpdateThemeSchema.safeParse({ theme: (formData.get('theme') as string) || undefined });
  if (!parsed.success) return { message: 'Invalid theme selection.' };

  try {
    const existing = await getBusinessById(businessId);
    if (!existing) return { message: 'Business not found' };

    await putBusiness({ ...existing, theme: parsed.data.theme, updatedAt: new Date().toISOString() });

    if (parsed.data.theme) {
      const draft = await ensureDraftPreview(businessId);
      if (draft && draft.theme.themeName !== parsed.data.theme) {
        const theme: PreviewTheme = { ...draft.theme, themeName: parsed.data.theme };
        PreviewThemeSchema.parse(theme);
        await putSitePreview({ ...draft, theme, updatedAt: new Date().toISOString() });
      }
    }
  } catch (err) {
    console.error('Failed to update customer theme:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save changes. Please try again.' };
  }

  return undefined;
}
