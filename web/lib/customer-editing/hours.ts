import 'server-only';
import type { PreviewContent } from '@/domain/models/site-preview';
import { PreviewContentSchema } from '@/domain/schemas/site-preview.schema';
import { ensureDraftPreview, putSitePreview } from '@/lib/db/site-previews';

/**
 * Patches only `PreviewContent.hours` (a single formatted display string,
 * e.g. "Mon–Fri 8am–6pm, Sat 9am–2pm") — deliberately not reusing
 * `updateCustomerSectionContent(..., 'contact', ...)`, which fully replaces
 * `content.contact` (phone/email/address) on every call. The Business
 * Information card's Edit modal collects a structured address, not the
 * single-string shape that generic handler expects, so calling it directly
 * would silently drop the preview's existing contact address. Hours has no
 * `Business`-level field to be canonical over (see `implementation.md`,
 * "Contact information has exactly one edit surface" — hours was never
 * actually part of that boundary, since it lives only on `PreviewContent`),
 * so this is the whole edit surface for it.
 */
export type UpdateHoursState = { message?: string } | undefined;

export async function updateCustomerBusinessHours(businessId: string, hours: string): Promise<UpdateHoursState> {
  try {
    const draft = await ensureDraftPreview(businessId);
    if (!draft) return { message: 'No website exists yet to edit.' };

    const trimmed = hours.trim();
    const content: PreviewContent = { ...draft.content, hours: trimmed || undefined };
    PreviewContentSchema.parse(content);
    await putSitePreview({ ...draft, content, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Failed to update customer business hours:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save changes. Please try again.' };
  }

  return undefined;
}
