import 'server-only';
import { z } from 'zod';
import type { PreviewContent, PreviewCta, PreviewCtaConfig } from '@/domain/models/site-preview';
import { CTA_ACTION_TYPES } from '@/domain/models/site-preview';
import { PreviewContentSchema, isHttpsUrl } from '@/domain/schemas/site-preview.schema';
import { updateBusiness } from '@/lib/db/businesses';
import { ensureDraftPreview, putSitePreview } from '@/lib/db/site-previews';

/**
 * Customer-scoped counterpart to the admin's `updatePreviewCtaAction`.
 * Unlike the admin action (which takes a trusted `previewId` the page
 * already loaded), this takes only `businessId` and resolves the target
 * preview itself via `ensureDraftPreview` — never a browser-supplied
 * `previewId`, and never a direct patch onto an already-published preview.
 *
 * Stage 25 — performs no auth/ownership check itself; the caller (the
 * customer-scoped Server Action in `actions.ts`) must call
 * `requireBusinessAccess()`/`requireBusinessOwnership()` before invoking
 * this, the same convention every module in `lib/customer-editing/` follows.
 */
const CtaTypeSchema = z.enum(CTA_ACTION_TYPES);

const CtaFormSchema = z
  .object({
    primaryType: CtaTypeSchema,
    primaryLabel: z.string().max(40),
    primaryValue: z.string().optional(),
    secondaryEnabled: z.string().optional(),
    secondaryType: CtaTypeSchema.optional(),
    secondaryLabel: z.string().max(40).optional(),
    secondaryValue: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.primaryType !== 'none' && !data.primaryLabel.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['primaryLabel'], message: 'Label is required' });
    }
    if (data.primaryType === 'external_url' && !(data.primaryValue && isHttpsUrl(data.primaryValue.trim()))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['primaryValue'], message: 'A valid https:// URL is required' });
    }
    if (data.secondaryEnabled === 'on') {
      if (!data.secondaryType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['secondaryType'], message: 'Action type is required' });
      } else {
        if (data.secondaryType !== 'none' && !data.secondaryLabel?.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['secondaryLabel'], message: 'Label is required' });
        }
        if (data.secondaryType === 'external_url' && !(data.secondaryValue && isHttpsUrl(data.secondaryValue.trim()))) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['secondaryValue'], message: 'A valid https:// URL is required' });
        }
      }
    }
  });

export type CustomerCtaState = { message?: string; errors?: Record<string, string[]> } | undefined;

function coerceOptional(value: string | null | undefined): string | undefined {
  return value?.trim() || undefined;
}

export async function updateCustomerCta(businessId: string, formData: FormData): Promise<CustomerCtaState> {
  const raw = {
    primaryType: formData.get('primaryType') as string,
    primaryLabel: (formData.get('primaryLabel') as string | null) ?? '',
    primaryValue: coerceOptional(formData.get('primaryValue') as string | null),
    secondaryEnabled: (formData.get('secondaryEnabled') as string | null) ?? undefined,
    secondaryType: (formData.get('secondaryType') as string | null) ?? undefined,
    secondaryLabel: (formData.get('secondaryLabel') as string | null) ?? undefined,
    secondaryValue: coerceOptional(formData.get('secondaryValue') as string | null),
  };

  const parsed = CtaFormSchema.safeParse(raw);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;

  const primary: PreviewCta = {
    type: data.primaryType,
    label: data.primaryType === 'none' ? '' : data.primaryLabel.trim(),
    ...(data.primaryValue?.trim() ? { value: data.primaryValue.trim() } : {}),
  };
  // Always an explicit value, never omitted — `resolvePreviewCtaConfig`
  // (app/b/[slug]/template/cta.tsx) falls back to a site-wide default
  // secondary CTA ("Request Service") whenever `secondary` is `undefined`,
  // so unchecking "Show a secondary button" and saving `undefined` here
  // would silently leave that default button showing instead of actually
  // hiding it. `type: 'none'` is what `resolvePreviewCta` treats as
  // "don't render this button."
  const secondary: PreviewCta =
    data.secondaryEnabled === 'on' && data.secondaryType
      ? {
          type: data.secondaryType,
          label: data.secondaryType === 'none' ? '' : (data.secondaryLabel ?? '').trim(),
          ...(data.secondaryValue?.trim() ? { value: data.secondaryValue.trim() } : {}),
        }
      : { type: 'none', label: '' };
  const cta: PreviewCtaConfig = { primary, secondary };

  try {
    const draft = await ensureDraftPreview(businessId);
    if (!draft) return { message: 'No website exists yet to configure a CTA for.' };

    const content: PreviewContent = {
      ...draft.content,
      hero: { ...draft.content.hero, ctaText: primary.label || draft.content.hero.ctaText },
      cta,
    };
    PreviewContentSchema.parse(content);
    await putSitePreview({ ...draft, content, updatedAt: new Date().toISOString() });
    await updateBusiness(businessId, { cta });
  } catch (err) {
    console.error('Failed to update customer CTA:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save CTA changes. Please try again.' };
  }

  return undefined;
}
