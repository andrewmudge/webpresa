import 'server-only';
import { z } from 'zod';
import type { PreviewContent, PreviewSocialLink } from '@/domain/models/site-preview';
import { PreviewContentSchema } from '@/domain/schemas/site-preview.schema';
import { getBusinessById, putBusiness } from '@/lib/db/businesses';
import { ensureDraftPreview, putSitePreview } from '@/lib/db/site-previews';
import { sanitizeAndDedupeSocialLinks } from '@/lib/firecrawl/normalize';
import { classifySocialPlatform } from '@/lib/social-links';

/**
 * Customer-scoped counterpart to the admin's `updateBusinessDetailsAction`
 * (`app/admin/(dashboard)/businesses/[businessId]/actions.ts`) — but
 * deliberately narrower. It writes only the canonical contact/identity
 * fields the Settings page (implementation.md, Stage 19) actually owns:
 * display name, phone, email, address, social links. The AI
 * generation-input fields admin also captures on this same form
 * (`servicesOffered`/`description`/`differentiators`/`brandTone`/`notes`)
 * feed the AI regeneration pipeline only, which this stage does not expose
 * to customers (see implementation.md, Stage 19, "Editing behavior" —
 * regeneration stays admin-only), so they're not part of this schema at
 * all.
 *
 * Deliberately takes no session/auth argument — the caller (the
 * customer-scoped Server Action) is responsible for `requireBusinessAccess`
 * returning `'full'` before calling this.
 */
const CustomerBusinessInfoSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(200),
  phone: z.string().max(40).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  addressLine1: z.string().max(200).optional(),
  addressCity: z.string().max(100).optional(),
  addressState: z.string().max(100).optional(),
  addressPostalCode: z.string().max(20).optional(),
  /** Raw multi-line textarea input, one URL per line. */
  socialLinks: z.string().max(2000).optional(),
});

export type CustomerBusinessInfoState = { message?: string; errors?: Record<string, string[]> } | undefined;

function coerceOptional(value: string | null | undefined): string | undefined {
  return value?.trim() || undefined;
}

function parseSocialLinksInput(raw: string | undefined): string[] {
  if (!raw) return [];
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.startsWith('http://') || line.startsWith('https://') ? line : `https://${line}`));
  return sanitizeAndDedupeSocialLinks(lines, 6);
}

export async function updateCustomerBusinessInfo(
  businessId: string,
  formData: FormData,
): Promise<CustomerBusinessInfoState> {
  const raw = {
    name: (formData.get('name') as string) ?? '',
    phone: coerceOptional(formData.get('phone') as string | null),
    email: coerceOptional(formData.get('email') as string | null),
    addressLine1: coerceOptional(formData.get('addressLine1') as string | null),
    addressCity: coerceOptional(formData.get('addressCity') as string | null),
    addressState: coerceOptional(formData.get('addressState') as string | null),
    addressPostalCode: coerceOptional(formData.get('addressPostalCode') as string | null),
    socialLinks: coerceOptional(formData.get('socialLinks') as string | null),
  };

  const parsed = CustomerBusinessInfoSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  const socialLinks = parseSocialLinksInput(data.socialLinks);
  if (data.socialLinks && socialLinks.length === 0) {
    return {
      errors: { socialLinks: ['No valid URLs found — enter one per line, e.g. https://facebook.com/yourbusiness'] },
    };
  }

  try {
    const existing = await getBusinessById(businessId);
    if (!existing) return { message: 'Business not found' };

    const address =
      data.addressLine1 && data.addressCity && data.addressState && data.addressPostalCode
        ? {
            line1: data.addressLine1,
            city: data.addressCity,
            state: data.addressState,
            postalCode: data.addressPostalCode,
            country: existing.address?.country ?? 'US',
          }
        : existing.address;

    await putBusiness({
      ...existing,
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      address,
      socialLinks: socialLinks.length > 0 ? socialLinks : existing.socialLinks,
      updatedAt: new Date().toISOString(),
    });

    // Dual-write, through the draft-safety lens: same "apply immediately to
    // the current preview" convenience the admin action gives, but landing
    // on a draft rather than silently patching an already-published
    // preview (see `ensureDraftPreview`'s doc comment).
    if (socialLinks.length > 0) {
      const draft = await ensureDraftPreview(businessId);
      if (draft) {
        const newSocialLinks: PreviewSocialLink[] = socialLinks.map((url) => ({
          platform: classifySocialPlatform(url),
          url,
        }));
        const content: PreviewContent = { ...draft.content, socialLinks: newSocialLinks };
        PreviewContentSchema.parse(content);
        await putSitePreview({ ...draft, content, updatedAt: new Date().toISOString() });
      }
    }
  } catch (err) {
    console.error('Failed to update customer business info:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save changes. Please try again.' };
  }

  return undefined;
}
