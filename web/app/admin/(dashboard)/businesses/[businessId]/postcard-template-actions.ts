'use server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getBusinessById, putBusiness, updateBusiness } from '@/lib/db/businesses';
import { POSTCARD_TEMPLATE_VARIANTS, type PostcardTemplateVariant } from '@/domain/models/postcard';

/**
 * Stage 26 (no-website postcard template) admin actions — mirrors
 * `scoring-actions.ts`'s `overrideScoreAction`/`clearScoreOverrideAction`
 * shape exactly: a durable override stored separately from the computed
 * default (`resolvePostcardTemplateVariant` in `lib/postcards/template.ts`),
 * so the automatic choice always remains recoverable.
 */

const TEMPLATE_VARIANT_SET = new Set<string>(POSTCARD_TEMPLATE_VARIANTS);

export async function overridePostcardTemplateAction(businessId: string, redirectTo: string, formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const business = await getBusinessById(businessId);
  if (!business) throw new Error('Business not found');

  const raw = String(formData.get('adminPostcardTemplateOverride') ?? '').trim();
  if (!TEMPLATE_VARIANT_SET.has(raw)) {
    redirect(`${redirectTo}?postcardTemplateOverride=invalid`);
  }

  await updateBusiness(businessId, { adminPostcardTemplateOverride: raw as PostcardTemplateVariant });

  redirect(`${redirectTo}?postcardTemplateOverride=saved`);
}

/**
 * Reverts to the automatic template choice — clears the override field
 * only, never touches `websiteUrl` or any other business data. Uses
 * `putBusiness` with the field omitted rather than `updateBusiness`, per
 * this codebase's established way to clear an optional field (see
 * `clearScoreOverrideAction`).
 */
export async function clearPostcardTemplateOverrideAction(businessId: string, redirectTo: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const business = await getBusinessById(businessId);
  if (!business) throw new Error('Business not found');

  const cleared = { ...business, updatedAt: new Date().toISOString() };
  delete cleared.adminPostcardTemplateOverride;
  await putBusiness(cleared);

  redirect(`${redirectTo}?postcardTemplateOverride=cleared`);
}
