import type { Business } from '@/domain/models/business';
import type { PostcardTemplateVariant } from '@/domain/models/postcard';

/**
 * Resolves which postcard front template a business gets — per business,
 * never per campaign, since a single campaign mixes businesses with and
 * without an existing website. `adminPostcardTemplateOverride`, when set,
 * always wins (see its doc comment on `Business`); otherwise the default is
 * computed from `websiteUrl`, mirroring the `hasWebsite` check already used
 * in `app/api/internal/scan/load-business/route.ts`.
 *
 * Every render/view call site (the mailed-artifact render page, the admin
 * postcard review page, the thumbnail, the campaign list) calls this same
 * function so the template choice never drifts between them.
 */
export function resolvePostcardTemplateVariant(
  business: Pick<Business, 'websiteUrl' | 'adminPostcardTemplateOverride'>,
): PostcardTemplateVariant {
  if (business.adminPostcardTemplateOverride) return business.adminPostcardTemplateOverride;
  return business.websiteUrl?.trim() ? 'has_website' : 'no_website';
}
