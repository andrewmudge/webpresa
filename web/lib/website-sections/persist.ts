import 'server-only';
import type { WebsiteSectionsConfig } from '@/domain/models/website-sections';
import { WEBSITE_SECTION_TYPES, REQUIRED_SECTION_TYPES, SECTION_CONFIG_VERSION } from '@/domain/constants/website-sections';
import { WebsiteSectionsConfigSchema } from '@/domain/schemas/website-sections.schema';
import { getBusinessById, updateBusiness } from '@/lib/db/businesses';

/**
 * Reconstructs and validates a full 15-entry `WebsiteSectionsConfig` from
 * `enabled_{type}`/`order_{type}` form fields and saves it. Extracted
 * (Stage 19) from the admin business detail page's `actions.ts`, where it
 * used to be a module-private function, so both the admin's
 * `saveWebsiteSectionsAction`/`autoSaveWebsiteSectionsAction` and the new
 * customer-scoped sections action call the identical validated write path
 * rather than two copies of the same reconstruction logic.
 *
 * Every catalog section is expected to be present in the submitted form
 * (required sections render as a locked "always on" row in both the admin
 * and customer UIs), so this reconstructs the full array rather than
 * merging a partial update. Required sections are force-enabled
 * server-side regardless of what the client sent, then the whole config is
 * validated strictly — any violation (bad order value, duplicate,
 * unsupported variant) rejects the save outright rather than silently
 * repairing it.
 *
 * Deliberately takes no session/auth argument — callers (admin or
 * customer) are responsible for authorizing the caller before invoking
 * this; this function only knows how to validate and persist.
 */
export async function persistWebsiteSections(
  businessId: string,
  formData: FormData,
): Promise<{ message: string } | undefined> {
  const business = await getBusinessById(businessId);
  if (!business) return { message: 'Business not found' };

  const sections = WEBSITE_SECTION_TYPES.map((type) => {
    const required = (REQUIRED_SECTION_TYPES as readonly string[]).includes(type);
    const orderRaw = formData.get(`order_${type}`);
    const order = typeof orderRaw === 'string' && orderRaw.trim() !== '' ? Number(orderRaw) : NaN;
    return {
      component: type,
      enabled: required || formData.get(`enabled_${type}`) === 'on',
      order: Number.isFinite(order) ? Math.trunc(order) : 0,
      variant: 'default',
    };
  });

  const config: WebsiteSectionsConfig = { sectionConfigVersion: SECTION_CONFIG_VERSION, sections };

  const parsed = WebsiteSectionsConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { message: parsed.error.issues.map((i) => i.message).join('; ') };
  }

  try {
    await updateBusiness(businessId, { websiteSections: parsed.data });
  } catch (err) {
    console.error('Failed to save website sections:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save section configuration. Please try again.' };
  }

  return undefined;
}
