'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { Business, BusinessTestimonial } from '@/domain/models/business';
import type { HeroStyle, PreviewContact, PreviewContent, PreviewCta, PreviewCtaConfig, PreviewSocialLink, PreviewTheme } from '@/domain/models/site-preview';
import { CTA_ACTION_TYPES } from '@/domain/models/site-preview';
import { PreviewContentSchema, PreviewThemeSchema, isHttpsUrl } from '@/domain/schemas/site-preview.schema';
import { createSitePreview } from '@/domain/factories/site-preview.factory';
import { generateAndSaveWebsite } from '@/lib/ai/generate-and-save-preview';
import { resolveBusinessThemeForSeed } from '@/lib/theme/select-theme';
import { checkHeroPhotoDimensions } from '@/lib/image/hero-dimensions';
import { buildDefaultCta } from './cta-defaults';
import {
  listPreviewsForBusiness,
  getSitePreviewById,
  putSitePreview,
  deletePreviewById,
  publishSitePreview,
} from '@/lib/db/site-previews';
import { listScansForBusiness, deleteScanEventById } from '@/lib/db/scan-events';
import { listPostcardsForBusiness, deletePostcardById } from '@/lib/db/postcards';
import { deleteBusinessById, getBusinessById, putBusiness, updateBusiness, releaseOwnership } from '@/lib/db/businesses';
import { listClaimsForBusiness, deleteClaimById, putClaim, revokeClaim } from '@/lib/db/claims';
import { createClaim } from '@/domain/factories/claim.factory';
import { generateAndHashClaimToken } from '@/lib/claim/token';
import { reconcileDomainConnection } from '@/lib/domains/reconcile';
import { disconnectDomainConnectionForTesting } from '@/lib/domains/disconnect';
import { adminGetCustomerProfileBySub } from '@/lib/auth/customer-cognito';
import { getSession } from '@/lib/auth/session';
import { createDefaultWebsiteSectionsConfig } from '@/domain/factories/website-sections.factory';
import { recommendWebsiteSections } from '@/lib/website-sections/recommend';
import { hasResolvableCta } from '@/lib/website-sections/availability';
import { enableWebsiteSection } from '@/lib/website-sections/resolve';
import { persistWebsiteSections } from '@/lib/website-sections/persist';
import { fetchAndMapGoogleReviews } from '@/lib/google-places/reviews';
import { mergeTestimonialsPreservingOrder } from '@/lib/testimonials/merge';
import { INDUSTRIES } from '@/domain/constants/industries';
import { BRAND_TONES } from '@/domain/constants/brand-tone';
import { THEME_NAMES } from '@/domain/constants/themes';
import { BUSINESS_SOURCES, BUSINESS_STATUSES } from '@/domain/models/business';
import { uploadBusinessAsset, appendBusinessPhotos, assetKeyFromUrl, fileExtension } from '@/lib/s3/business-assets';
import { deleteAsset } from '@/lib/s3/assets';
import { sanitizeAndDedupeSocialLinks } from '@/lib/firecrawl/normalize';
import { classifySocialPlatform } from '@/lib/social-links';
import type { BusinessFormState } from '../actions';
import type { WebsiteSectionType } from '@/domain/constants/website-sections';
import type { GalleryImage, PreviewService } from '@/domain/models/site-preview';
import { parseIndexedList } from './form-list';

// ---------------------------------------------------------------------------
// Business details + photos — inline edit on the business detail page, and
// the wizard steps ("Add business" → details → photos → sections; see
// createBusinessAction in `../actions.ts` for step 1). Splitting these into
// two narrow actions (rather than one big update, or reusing a single
// monolithic form) means each only ever writes its own slice of fields —
// saving the Photos card can never accidentally clear Business Details
// fields and vice versa.
// ---------------------------------------------------------------------------

const WEBSITE_GENERATION_FIELDS = {
  servicesOffered: z.string().max(2000).optional(),
  serviceAreas: z.string().max(2000).optional(),
  description: z.string().max(2000).optional(),
  differentiators: z.string().max(2000).optional(),
  brandTone: z.enum(BRAND_TONES).optional(),
  notes: z.string().max(2000).optional(),
  /** Raw multi-line textarea input, one URL per line — parsed/validated/deduped by `parseSocialLinksInput` before persisting. */
  socialLinks: z.string().max(2000).optional(),
};

/**
 * Splits the "Social Links" textarea into a bounded, deduped list of valid
 * URLs — same sanitization Firecrawl's own discovered links go through.
 * Each line is scheme-normalized first (same as `normalizeUrl` already does
 * for `websiteUrl`) — `sanitizeAndDedupeSocialLinks` requires a real
 * `http(s)://` scheme to consider a URL valid, so a bare domain typed
 * without one (e.g. `facebook.com/yourbusiness`) would otherwise be
 * silently dropped instead of accepted.
 */
function parseSocialLinksInput(raw: string | undefined): string[] {
  if (!raw) return [];
  const lines = raw
    .split('\n')
    .map((line) => normalizeUrl(line.trim()))
    .filter((line): line is string => !!line);
  return sanitizeAndDedupeSocialLinks(lines, 6);
}

const UpdateBusinessDetailsSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  industry: z.enum(INDUSTRIES),
  legalName: z.string().max(200).optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  websiteUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  googlePlaceId: z.string().optional(),
  addressLine1: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressPostalCode: z.string().optional(),
  ...WEBSITE_GENERATION_FIELDS,
});

function normalizeUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Updates identity/contact/address/website-generation fields. Never
 * touches `logoUrl`/`photoUrls`/photo-slot overrides (`updatePhotosAction`),
 * `theme` (`updateThemeAction`), or `source`/`status` (`updateAdminFieldsAction`).
 */
export async function updateBusinessDetailsAction(
  businessId: string,
  redirectTo: string,
  _prevState: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

  const raw = {
    name: formData.get('name') as string,
    industry: formData.get('industry') as string,
    legalName: coerceOptional(formData.get('legalName') as string | undefined),
    phone: coerceOptional(formData.get('phone') as string | undefined),
    email: coerceOptional(formData.get('email') as string | undefined),
    websiteUrl: normalizeUrl(coerceOptional(formData.get('websiteUrl') as string | undefined)),
    googlePlaceId: coerceOptional(formData.get('googlePlaceId') as string | undefined),
    addressLine1: coerceOptional(formData.get('addressLine1') as string | undefined),
    addressCity: coerceOptional(formData.get('addressCity') as string | undefined),
    addressState: coerceOptional(formData.get('addressState') as string | undefined),
    addressPostalCode: coerceOptional(formData.get('addressPostalCode') as string | undefined),
    servicesOffered: coerceOptional(formData.get('servicesOffered') as string | undefined),
    serviceAreas: coerceOptional(formData.get('serviceAreas') as string | undefined),
    description: coerceOptional(formData.get('description') as string | undefined),
    differentiators: coerceOptional(formData.get('differentiators') as string | undefined),
    brandTone: (formData.get('brandTone') as string) || undefined,
    notes: coerceOptional(formData.get('notes') as string | undefined),
    socialLinks: coerceOptional(formData.get('socialLinks') as string | undefined),
  };

  const parsed = UpdateBusinessDetailsSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const socialLinks = parseSocialLinksInput(data.socialLinks);
  // Surface parsing failures instead of silently saving nothing — every
  // line failed sanitization (e.g. not a real URL) if non-blank input
  // produced zero valid links.
  if (data.socialLinks && socialLinks.length === 0) {
    return {
      errors: {
        socialLinks: ['No valid URLs found — enter one per line, e.g. https://facebook.com/yourbusiness'],
      },
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
      industry: data.industry,
      legalName: data.legalName,
      phone: data.phone,
      email: data.email,
      websiteUrl: data.websiteUrl || undefined,
      googlePlaceId: data.googlePlaceId,
      address,
      servicesOffered: data.servicesOffered,
      serviceAreas: data.serviceAreas,
      description: data.description,
      differentiators: data.differentiators,
      brandTone: data.brandTone,
      notes: data.notes,
      socialLinks: socialLinks.length > 0 ? socialLinks : undefined,
      updatedAt: new Date().toISOString(),
    });

    // Dual-write: admin-entered social links apply to the live preview
    // immediately, not just the next regeneration — same reasoning as the
    // theme/photo-slot dual-writes below. Only ever patches when the admin
    // has non-empty social links to apply — an empty/cleared field is left
    // alone so this can never silently wipe out Firecrawl-discovered links
    // that a prior enrichment run already put on the current preview
    // (mirrors generatePreviewContent's own "Business wins only when
    // non-empty" rule).
    if (socialLinks.length > 0) {
      const previews = await listPreviewsForBusiness(businessId);
      const latest = previews[0];
      if (latest) {
        const newSocialLinks: PreviewSocialLink[] = socialLinks.map((url) => ({
          platform: classifySocialPlatform(url),
          url,
        }));
        const content: PreviewContent = { ...latest.content, socialLinks: newSocialLinks };
        PreviewContentSchema.parse(content);
        await putSitePreview({ ...latest, content, updatedAt: new Date().toISOString() });
      }
    }
  } catch (err) {
    console.error('Failed to update business details:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save changes. Please try again.' };
  }

  redirect(redirectTo);
}

const UpdateThemeSchema = z.object({
  theme: z.enum(THEME_NAMES).optional(),
});

/** Updates only `Business.theme`. Never touches any other field. */
export async function updateThemeAction(
  businessId: string,
  redirectTo: string,
  _prevState: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

  const parsed = UpdateThemeSchema.safeParse({ theme: (formData.get('theme') as string) || undefined });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const existing = await getBusinessById(businessId);
    if (!existing) return { message: 'Business not found' };

    await putBusiness({ ...existing, theme: parsed.data.theme, updatedAt: new Date().toISOString() });

    // Dual-write: a specific theme pick applies to the live preview
    // immediately, not just the next regeneration — same reasoning as the
    // photo-slot dual-write in updatePhotosAction. Leaving it on "Auto"
    // (undefined) makes no live change; there's no specific new theme to
    // apply, and the current preview keeps whatever it already had.
    if (parsed.data.theme) {
      const previews = await listPreviewsForBusiness(businessId);
      const latest = previews[0];
      if (latest && latest.theme.themeName !== parsed.data.theme) {
        const theme: PreviewTheme = { ...latest.theme, themeName: parsed.data.theme };
        PreviewThemeSchema.parse(theme);
        await putSitePreview({ ...latest, theme, updatedAt: new Date().toISOString() });
      }
    }
  } catch (err) {
    console.error('Failed to update theme:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save changes. Please try again.' };
  }

  redirect(redirectTo);
}

const UpdateAdminFieldsSchema = z.object({
  source: z.enum(BUSINESS_SOURCES),
  status: z.enum(BUSINESS_STATUSES),
});

/** Updates only `Business.source`/`status`. Never touches any other field. */
export async function updateAdminFieldsAction(
  businessId: string,
  redirectTo: string,
  _prevState: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

  const parsed = UpdateAdminFieldsSchema.safeParse({
    source: formData.get('source') as string,
    status: formData.get('status') as string,
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const existing = await getBusinessById(businessId);
    if (!existing) return { message: 'Business not found' };

    await putBusiness({
      ...existing,
      source: parsed.data.source,
      status: parsed.data.status,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to update admin fields:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save changes. Please try again.' };
  }

  redirect(redirectTo);
}

const UpdatePhotosSchema = z.object({
  heroPhotoUrl: z.string().optional(),
  heroPhotoUrlMobile: z.string().optional(),
  aboutPhotoUrl: z.string().optional(),
  whyChooseUsPhotoUrl: z.string().optional(),
  servicesPhotoUrl: z.string().optional(),
  logoPhotoUrl: z.string().optional(),
});

/**
 * Resolves the logo picker's value against the existing `logoUrl`: `undefined`
 * (left on "Auto") keeps it unchanged, `'none'` clears it, anything else
 * (a URL from `photoUrls`, e.g. a promoted scan image) becomes the new logo.
 * Unlike the four section slots, there's no automatic upload-order fallback
 * for the logo — "Auto" here means "don't touch it," not "pick one for me."
 */
function resolveLogoUrl(picked: string | undefined, existingLogoUrl: string | undefined): string | undefined {
  if (!picked) return existingLogoUrl;
  if (picked === 'none') return undefined;
  return picked;
}

/**
 * Resolves a photo-slot form value into a theme-field patch: `undefined`
 * means "left on Auto" (no change to the live preview — there's no specific
 * new photo to apply), `'none'` clears the slot's photo, anything else is a
 * URL to apply.
 */
function resolveThemePhotoPatch(value: string | undefined): { apply: boolean; url: string | undefined } {
  if (!value) return { apply: false, url: undefined };
  if (value === 'none') return { apply: true, url: undefined };
  return { apply: true, url: value };
}

/** Mirrors business.schema.ts's `photoUrls` bound — checked before appending a direct slot upload. */
const MAX_BUSINESS_PHOTOS = 6;

/**
 * Per-slot direct-upload field names (see `PhotoPickerField`'s
 * `uploadFieldName` prop) — lets an admin upload a brand-new photo straight
 * into a section slot without first going back to the main Photos card. A
 * file present here always wins over whatever that slot's picker selected.
 */
const SLOT_UPLOAD_FIELDS = {
  heroPhotoUrl: 'heroPhotoFile',
  heroPhotoUrlMobile: 'heroPhotoFileMobile',
  aboutPhotoUrl: 'aboutPhotoFile',
  whyChooseUsPhotoUrl: 'whyChooseUsPhotoFile',
  servicesPhotoUrl: 'servicesPhotoFile',
} as const;

/**
 * Uploads logo/photos and saves photo-slot assignment overrides on the
 * `Business` record (persists for future regenerations), and — when a slot
 * was explicitly set to a specific photo or "no photo" — also patches the
 * matching field on the business's most recent `SitePreview.theme` in
 * place, so the change is visible on the live preview immediately rather
 * than only on the next "Generate Website" run. Never touches any other
 * field on either record.
 */
export async function updatePhotosAction(
  businessId: string,
  redirectTo: string,
  _prevState: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

  const raw = {
    heroPhotoUrl: (formData.get('heroPhotoUrl') as string) || undefined,
    heroPhotoUrlMobile: (formData.get('heroPhotoUrlMobile') as string) || undefined,
    aboutPhotoUrl: (formData.get('aboutPhotoUrl') as string) || undefined,
    whyChooseUsPhotoUrl: (formData.get('whyChooseUsPhotoUrl') as string) || undefined,
    servicesPhotoUrl: (formData.get('servicesPhotoUrl') as string) || undefined,
    logoPhotoUrl: (formData.get('logoPhotoUrl') as string) || undefined,
  };

  const parsed = UpdatePhotosSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  try {
    const existing = await getBusinessById(businessId);
    if (!existing) return { message: 'Business not found' };

    // Logo/bulk-photo uploads no longer go through this action — the
    // top-level Logo/Business-photos fields were replaced by the Photo
    // Manager's own instant actions (addBusinessPhotosAction,
    // deleteBusinessPhotoAction, updateBusinessLogoAction, below). This
    // action's remaining job is exactly Photo Assignment: slot overrides,
    // plus the five per-slot direct-upload inputs, which only ever grow
    // photoUrls, never replace it.
    let photoUrls = existing.photoUrls ?? [];

    const slotOverrides: Partial<Record<keyof typeof SLOT_UPLOAD_FIELDS, string>> = {};
    for (const [slotKey, fieldName] of Object.entries(SLOT_UPLOAD_FIELDS) as [
      keyof typeof SLOT_UPLOAD_FIELDS,
      string,
    ][]) {
      const file = formData.get(fieldName);
      if (file instanceof File && file.size > 0) {
        if (photoUrls.length >= MAX_BUSINESS_PHOTOS) {
          return { message: `Maximum ${MAX_BUSINESS_PHOTOS} photos allowed — remove one in the Photos card first.` };
        }
        const url = await uploadBusinessAsset(businessId, file, `photos/${crypto.randomUUID()}.${fileExtension(file)}`);
        photoUrls = [...photoUrls, url];
        slotOverrides[slotKey] = url;
      }
    }

    const heroPhotoUrl = slotOverrides.heroPhotoUrl ?? data.heroPhotoUrl;
    const heroPhotoUrlMobile = slotOverrides.heroPhotoUrlMobile ?? data.heroPhotoUrlMobile;
    const aboutPhotoUrl = slotOverrides.aboutPhotoUrl ?? data.aboutPhotoUrl;
    const whyChooseUsPhotoUrl = slotOverrides.whyChooseUsPhotoUrl ?? data.whyChooseUsPhotoUrl;
    const servicesPhotoUrl = slotOverrides.servicesPhotoUrl ?? data.servicesPhotoUrl;

    await putBusiness({
      ...existing,
      heroPhotoUrl,
      heroPhotoUrlMobile,
      aboutPhotoUrl,
      whyChooseUsPhotoUrl,
      servicesPhotoUrl,
      logoUrl: resolveLogoUrl(data.logoPhotoUrl, existing.logoUrl),
      photoUrls,
      updatedAt: new Date().toISOString(),
    });

    // Dual-write: apply explicitly-set slots to the live preview too.
    const hero = resolveThemePhotoPatch(heroPhotoUrl);
    const heroMobile = resolveThemePhotoPatch(heroPhotoUrlMobile);
    const about = resolveThemePhotoPatch(aboutPhotoUrl);
    const whyChooseUs = resolveThemePhotoPatch(whyChooseUsPhotoUrl);
    const services = resolveThemePhotoPatch(servicesPhotoUrl);

    if (hero.apply || heroMobile.apply || about.apply || whyChooseUs.apply || services.apply) {
      const previews = await listPreviewsForBusiness(businessId);
      const latest = previews[0];
      if (latest) {
        // heroStyle must be recomputed whenever the hero photo itself
        // changes — it's not just "which URL to show", it decides which
        // rendering branch GeneratedHero takes at all (a stored
        // heroStyle: 'illustration' from the original generation ignores
        // heroImageUrl completely, so patching the URL alone silently did
        // nothing when the preview had no photo at generation time).
        let heroStyle: HeroStyle | undefined;
        if (hero.apply) {
          if (!hero.url) {
            heroStyle = 'illustration';
          } else {
            const dimensionCheck = await checkHeroPhotoDimensions(hero.url);
            heroStyle = dimensionCheck?.isFullBleedEligible ? 'image' : 'imageSplit';
          }
        }

        const theme: PreviewTheme = {
          ...latest.theme,
          ...(hero.apply ? { heroImageUrl: hero.url, heroStyle } : {}),
          ...(heroMobile.apply ? { heroImageUrlMobile: heroMobile.url } : {}),
          ...(about.apply ? { aboutSectionImageUrl: about.url } : {}),
          ...(whyChooseUs.apply ? { aboutImageUrl: whyChooseUs.url } : {}),
          ...(services.apply ? { servicesImageUrl: services.url } : {}),
        };
        PreviewThemeSchema.parse(theme);
        await putSitePreview({ ...latest, theme, updatedAt: new Date().toISOString() });
      }
    }
  } catch (err) {
    console.error('Failed to update business photos:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save changes. Please try again.' };
  }

  redirect(redirectTo);
}

// ---------------------------------------------------------------------------
// Photo Manager — instant, no-redirect logo/photo upload and delete
// (business detail page + onboarding wizard step 2, see PhotoManager.tsx).
// Unlike updatePhotosAction above, these never redirect — they're dispatched
// imperatively from client state via useActionState, matching the
// auto-save convention autoSaveWebsiteSectionsAction already established
// elsewhere in this file, so the client can apply the result optimistically
// without a full page reload.
// ---------------------------------------------------------------------------

export type PhotoManagerState = { message?: string; photoUrls?: string[]; logoUrl?: string } | undefined;

export async function addBusinessPhotosAction(
  businessId: string,
  _prevState: PhotoManagerState,
  formData: FormData,
): Promise<PhotoManagerState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

  const files = formData.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { message: 'Choose at least one photo to upload.' };

  try {
    const existing = await getBusinessById(businessId);
    if (!existing) return { message: 'Business not found' };

    const existingPhotoUrls = existing.photoUrls ?? [];
    if (existingPhotoUrls.length + files.length > MAX_BUSINESS_PHOTOS) {
      return {
        message: `Maximum ${MAX_BUSINESS_PHOTOS} photos allowed (${existingPhotoUrls.length} existing, ${files.length} selected) — remove some first or select fewer.`,
      };
    }

    const photoUrls = await appendBusinessPhotos(businessId, existingPhotoUrls, files);
    await putBusiness({ ...existing, photoUrls, updatedAt: new Date().toISOString() });

    return { photoUrls };
  } catch (err) {
    console.error('Failed to add business photos:', err instanceof Error ? err.message : err);
    return { message: 'Failed to upload photos. Please try again.' };
  }
}

const DeletePhotoSchema = z.object({ photoUrl: z.string().min(1) });

/**
 * Removes one photo from Business.photoUrls and its S3 object. Clears any
 * slot override (hero/heroMobile/about/whyChooseUs/services) or logoUrl
 * that was pinned to the deleted photo, falling back to Auto, and — for
 * exactly the slots that were just cleared — dual-writes the business's
 * latest SitePreview.theme the same way updatePhotosAction already does for
 * an explicit slot change, so a deleted photo never keeps rendering on the
 * live preview.
 */
export async function deleteBusinessPhotoAction(
  businessId: string,
  _prevState: PhotoManagerState,
  formData: FormData,
): Promise<PhotoManagerState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

  const parsed = DeletePhotoSchema.safeParse({ photoUrl: formData.get('photoUrl') });
  if (!parsed.success) return { message: 'No photo specified.' };
  const { photoUrl } = parsed.data;

  try {
    const existing = await getBusinessById(businessId);
    if (!existing) return { message: 'Business not found' };

    const existingPhotoUrls = existing.photoUrls ?? [];
    if (!existingPhotoUrls.includes(photoUrl)) {
      // Already gone (e.g. a second tab deleted it first) — succeed idempotently.
      return { photoUrls: existingPhotoUrls, logoUrl: existing.logoUrl };
    }

    const photoUrls = existingPhotoUrls.filter((u) => u !== photoUrl);

    const heroCleared = existing.heroPhotoUrl === photoUrl;
    const heroMobileCleared = existing.heroPhotoUrlMobile === photoUrl;
    const aboutCleared = existing.aboutPhotoUrl === photoUrl;
    const whyChooseUsCleared = existing.whyChooseUsPhotoUrl === photoUrl;
    const servicesCleared = existing.servicesPhotoUrl === photoUrl;
    const logoCleared = existing.logoUrl === photoUrl;

    const heroPhotoUrl = heroCleared ? undefined : existing.heroPhotoUrl;
    const heroPhotoUrlMobile = heroMobileCleared ? undefined : existing.heroPhotoUrlMobile;
    const aboutPhotoUrl = aboutCleared ? undefined : existing.aboutPhotoUrl;
    const whyChooseUsPhotoUrl = whyChooseUsCleared ? undefined : existing.whyChooseUsPhotoUrl;
    const servicesPhotoUrl = servicesCleared ? undefined : existing.servicesPhotoUrl;
    const logoUrl = logoCleared ? undefined : existing.logoUrl;

    await putBusiness({
      ...existing,
      photoUrls,
      heroPhotoUrl,
      heroPhotoUrlMobile,
      aboutPhotoUrl,
      whyChooseUsPhotoUrl,
      servicesPhotoUrl,
      logoUrl,
      updatedAt: new Date().toISOString(),
    });

    const key = assetKeyFromUrl(photoUrl);
    if (key) {
      // Business record is already updated; an S3 delete failure here is an
      // orphaned-object cleanup concern, not a reason to fail the
      // user-facing action.
      await deleteAsset(key).catch((err) => {
        console.error('Failed to delete S3 object for removed photo:', err instanceof Error ? err.message : err);
      });
    }

    // Dual-write, mirroring updatePhotosAction's block: apply 'none' to
    // exactly the slots that were just cleared, so the live preview never
    // keeps rendering a now-deleted image.
    const hero = resolveThemePhotoPatch(heroCleared ? 'none' : undefined);
    const heroMobile = resolveThemePhotoPatch(heroMobileCleared ? 'none' : undefined);
    const about = resolveThemePhotoPatch(aboutCleared ? 'none' : undefined);
    const whyChooseUs = resolveThemePhotoPatch(whyChooseUsCleared ? 'none' : undefined);
    const services = resolveThemePhotoPatch(servicesCleared ? 'none' : undefined);

    if (hero.apply || heroMobile.apply || about.apply || whyChooseUs.apply || services.apply) {
      const previews = await listPreviewsForBusiness(businessId);
      const latest = previews[0];
      if (latest) {
        const heroStyle: HeroStyle | undefined = hero.apply ? 'illustration' : undefined;

        const theme: PreviewTheme = {
          ...latest.theme,
          ...(hero.apply ? { heroImageUrl: hero.url, heroStyle } : {}),
          ...(heroMobile.apply ? { heroImageUrlMobile: heroMobile.url } : {}),
          ...(about.apply ? { aboutSectionImageUrl: about.url } : {}),
          ...(whyChooseUs.apply ? { aboutImageUrl: whyChooseUs.url } : {}),
          ...(services.apply ? { servicesImageUrl: services.url } : {}),
        };
        PreviewThemeSchema.parse(theme);
        await putSitePreview({ ...latest, theme, updatedAt: new Date().toISOString() });
      }
    }

    return { photoUrls, logoUrl };
  } catch (err) {
    console.error('Failed to delete business photo:', err instanceof Error ? err.message : err);
    return { message: 'Failed to delete photo. Please try again.' };
  }
}

export async function updateBusinessLogoAction(
  businessId: string,
  _prevState: PhotoManagerState,
  formData: FormData,
): Promise<PhotoManagerState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

  const file = formData.get('logo');
  if (!(file instanceof File) || file.size === 0) return { message: 'Choose a logo file to upload.' };

  try {
    const existing = await getBusinessById(businessId);
    if (!existing) return { message: 'Business not found' };

    const logoUrl = await uploadBusinessAsset(businessId, file, `logo.${fileExtension(file)}`);
    await putBusiness({ ...existing, logoUrl, updatedAt: new Date().toISOString() });

    return { logoUrl };
  } catch (err) {
    console.error('Failed to update business logo:', err instanceof Error ? err.message : err);
    return { message: 'Failed to upload logo. Please try again.' };
  }
}

// ---------------------------------------------------------------------------
// Industry-specific seed content
//
// DEV_FIXTURE: All content here is clearly fictional development data.
// No placeholder photos are used — a seeded business with no uploaded
// photos renders the same themed no-photo fallback as any other business.
//
// Do NOT represent these as real businesses, real reviews, real credentials,
// real ratings, or real statistics. Content must pass PreviewContentSchema.
// ---------------------------------------------------------------------------

type SeedOverrides = {
  services: { name: string; description: string }[];
  differentiators: { title: string; description: string }[];
};

const INDUSTRY_SEEDS: Partial<Record<string, SeedOverrides>> = {
  plumbing: {
    services: [
      { name: 'Drain Cleaning', description: 'Hydro-jetting and snaking to clear stubborn clogs fast and completely.' },
      { name: 'Leak Detection & Repair', description: 'Non-invasive tools to find hidden leaks before they cause damage.' },
      { name: 'Water Heater Service', description: 'Tank and tankless water heater repair, maintenance, and installation.' },
      { name: 'Toilet Repair & Install', description: 'From running toilets to full replacements — same-day availability.' },
      { name: 'Pipe Repair & Replacement', description: 'Durable repairs for burst, corroded, or aging pipes of any material.' },
      { name: 'Fixture Installation', description: 'Faucets, sinks, showers, and bathtub installations done right.' },
    ],
    differentiators: [
      { title: 'On-Time Arrivals', description: 'We respect your schedule. If we\'re running late, you\'ll hear from us in advance.' },
      { title: 'Upfront Flat-Rate Pricing', description: 'You get a clear quote before work begins. No hourly surprises, no hidden fees.' },
      { title: 'Clean Work Guarantee', description: 'We leave your home cleaner than we found it. Every single visit.' },
      { title: 'Rapid Response', description: 'Most calls are answered within minutes and service is dispatched the same day.' },
    ],
  },
  hvac: {
    services: [
      { name: 'AC Repair & Service', description: 'Diagnose and repair any cooling system — fast, reliable, same-day.' },
      { name: 'Heating Repair', description: 'Furnace, heat pump, and boiler repairs to keep your home comfortable.' },
      { name: 'System Installation', description: 'High-efficiency HVAC system installations sized for your space.' },
      { name: 'Maintenance Plans', description: 'Seasonal tune-ups that extend equipment life and reduce energy bills.' },
      { name: 'Air Quality Solutions', description: 'Filtration, humidifiers, and ventilation for a healthier indoor environment.' },
    ],
    differentiators: [
      { title: 'Same-Day Service', description: 'We dispatch technicians quickly so you\'re not left waiting in discomfort.' },
      { title: 'Transparent Estimates', description: 'Every service begins with a clear written estimate — no surprises.' },
      { title: 'Certified Technicians', description: 'Our team is trained and experienced on all major HVAC brands and systems.' },
      { title: 'Energy-Efficiency Focus', description: 'We recommend solutions that reduce your utility costs over time.' },
    ],
  },
  roofing: {
    services: [
      { name: 'Roof Repair', description: 'Fast, lasting repairs for leaks, missing shingles, and storm damage.' },
      { name: 'Full Roof Replacement', description: 'Complete tear-off and installation with quality materials and warranty.' },
      { name: 'Storm Damage Assessment', description: 'Thorough inspections after severe weather to document all damage.' },
      { name: 'Gutter Installation', description: 'Seamless gutter systems that protect your foundation and landscaping.' },
      { name: 'Roof Inspections', description: 'Comprehensive annual inspections to catch problems before they grow.' },
    ],
    differentiators: [
      { title: 'Quality Materials', description: 'We work only with proven materials backed by manufacturer warranties.' },
      { title: 'Detailed Documentation', description: 'Full photo documentation before, during, and after every project.' },
      { title: 'Clean Job Sites', description: 'We protect your property and clean up completely when the job is done.' },
      { title: 'Fair, Written Quotes', description: 'Every project starts with a detailed, written proposal — no verbal estimates.' },
    ],
  },
  landscaping: {
    services: [
      { name: 'Lawn Care & Mowing', description: 'Regular maintenance to keep your lawn healthy, green, and well-manicured.' },
      { name: 'Landscape Design', description: 'Custom designs that enhance curb appeal and work with your property.' },
      { name: 'Irrigation Systems', description: 'Installation and repair of efficient irrigation to protect your investment.' },
      { name: 'Tree & Shrub Care', description: 'Pruning, trimming, and removal done safely by trained professionals.' },
      { name: 'Seasonal Cleanups', description: 'Spring and fall cleanups that prepare your yard for the season ahead.' },
    ],
    differentiators: [
      { title: 'Consistent Crews', description: 'The same team returns each visit — they learn your property and preferences.' },
      { title: 'Eco-Friendly Practices', description: 'We use responsible products and techniques to protect your soil and ecosystem.' },
      { title: 'Responsive Communication', description: 'You can always reach someone — before, during, and after the job.' },
      { title: 'Satisfaction Promise', description: 'If something doesn\'t look right, we come back and make it right.' },
    ],
  },
};

const DEFAULT_SEED: SeedOverrides = {
  services: [
    { name: 'Core Service', description: 'Quality work delivered on time and within budget by experienced professionals.' },
    { name: 'Inspections & Estimates', description: 'Free, no-obligation estimates provided by our knowledgeable team.' },
    { name: 'Maintenance & Upkeep', description: 'Ongoing maintenance programs to protect your investment long-term.' },
    { name: 'Emergency Response', description: 'Available for urgent situations — fast dispatch and reliable resolution.' },
  ],
  differentiators: [
    { title: 'On-Time Service', description: 'We respect your schedule and communicate proactively if plans change.' },
    { title: 'Upfront Pricing', description: 'Clear quotes before any work begins — no hidden charges or surprises.' },
    { title: 'Clean Work Areas', description: 'We protect your property and leave every job site clean and tidy.' },
    { title: 'Quality You Can Count On', description: 'We take pride in every job and stand behind the work we deliver.' },
  ],
};

function buildSeedContent(business: Business): PreviewContent {
  const industry = business.industry;
  const seed = INDUSTRY_SEEDS[industry] ?? DEFAULT_SEED;
  const city = business.address?.city ?? 'your area';
  const state = business.address?.state;
  const locationLabel = state ? `${city}, ${state}` : city;

  const serviceAreas = [
    locationLabel,
    ...(business.address?.city ? [`Surrounding ${business.address.city} area`] : []),
  ].filter(Boolean);

  const contact: PreviewContact = {
    ...(business.phone ? { phone: business.phone } : {}),
    ...(business.email ? { email: business.email } : {}),
    ...(business.address
      ? {
          address: [
            business.address.line1,
            business.address.city,
            business.address.state,
            business.address.postalCode,
          ].filter(Boolean).join(', '),
        }
      : {}),
  };

  const cta = buildDefaultCta(contact);

  const raw: PreviewContent = {
    hero: {
      headline: business.name,
      subheadline: `Dependable ${industry.replace(/_/g, ' ')} services in ${city}. Professional results, clear communication, and no hidden fees.`,
      // Legacy field kept in sync with the primary CTA label — the template
      // reads `content.cta` directly and only falls back to this for
      // previews saved before CTA config existed.
      ctaText: cta.primary.label || 'Contact Us',
    },
    services: seed.services,
    tagline: `Trusted ${industry.replace(/_/g, ' ')} services — proudly serving ${locationLabel}.`,
    aboutText: `${business.name} is a locally operated ${industry.replace(/_/g, ' ')} company dedicated to delivering quality work and exceptional service to our community. We believe in honest communication, fair pricing, and doing the job right the first time. Every project — big or small — gets our full attention and professional care.`,
    contact,
    serviceAreas,
    differentiators: seed.differentiators,
    hours: 'Mon–Fri 8am–6pm · Sat 9am–3pm',
    cta,
  };

  PreviewContentSchema.parse(raw);
  return raw;
}

async function buildSeedTheme(business: Business): Promise<PreviewTheme> {
  const themeName = await resolveBusinessThemeForSeed(business);
  return {
    themeName,
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    // No placeholder photo — a seeded business with no uploaded photos
    // renders the same themed no-photo illustration as any other business.
  };
}

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function createSeedPreviewAction(businessId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const business = await getBusinessById(businessId);
  if (!business) throw new Error('Business not found');

  const content = buildSeedContent(business);
  const theme = await buildSeedTheme(business);

  const existing = await listPreviewsForBusiness(businessId);
  const previousVersion = existing.length > 0 ? Math.max(...existing.map((p) => p.version)) : 0;

  const preview = createSitePreview({
    businessId: business.businessId,
    slug: business.slug,
    templateId: 'local-business-v1',
    content,
    theme,
    previousVersion,
  });

  const published = { ...preview, status: 'published' as const, updatedAt: new Date().toISOString() };
  await putSitePreview(published);

  // Brand Theme System Step 3 — persist the resolved theme so every future
  // regeneration reuses it instead of re-deriving it.
  if (!business.theme && theme.themeName) {
    await updateBusiness(business.businessId, { theme: theme.themeName });
  }
  // Same durability rule for CTA — see the `Business.cta` doc comment.
  if (!business.cta) {
    await updateBusiness(business.businessId, { cta: content.cta });
  }

  redirect(`/admin/businesses/${business.businessId}`);
}

// ---------------------------------------------------------------------------
// Publish preview — makes a draft/ready preview publicly visible at /b/[slug]
// ---------------------------------------------------------------------------

export type PublishPreviewState = { error?: string } | undefined;

/**
 * Publishes a `draft`/`ready` preview. Until this exists, `resolvePreview()`
 * (`app/b/[slug]/page.tsx`) never shows anything to a non-admin visitor —
 * the "DRAFT PREVIEW — visible to admins only" banner is the *only* thing a
 * real customer would otherwise see (or rather, they'd 404, since that
 * banner itself is admin-only). The Stage 17 claim flow redirects a
 * validated visitor straight to `/b/[slug]`, so a business needs a published
 * preview before its claim link is usable by an actual customer.
 */
export async function publishPreviewAction(
  businessId: string,
  previewId: string,
  // Required by useActionState's (state, payload) signature but unused — no form fields, just a trigger button.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: PublishPreviewState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<PublishPreviewState> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const published = await publishSitePreview(previewId);
  if (!published) return { error: 'Preview not found.' };

  await updateBusiness(businessId, { currentPreviewId: published.previewId });

  redirect(`/admin/businesses/${businessId}`);
}

// ---------------------------------------------------------------------------
// Manual AI website generation (Stage 11)
// ---------------------------------------------------------------------------

export type GenerateWebsiteState = { message?: string } | undefined;

/**
 * Thin wrapper around `generateAndSaveWebsite` (`lib/ai/generate-and-save-preview.ts`)
 * preserving this file's existing `GenerateWebsiteState` shape, shared by
 * `generateWebsiteAction` (the business detail page's "Generate Website"
 * button) and `finishOnboardingAction` (the wizard's final step). The actual
 * cap check, OpenAI call, and theme/CTA seeding now live in the shared lib
 * function — extracted so Stage 16's no-website workflow branch
 * (`/api/internal/scan/generate-preview`) can call the identical,
 * already-tested logic rather than duplicating it. Never redirects; callers
 * decide what happens after.
 */
async function runWebsiteGeneration(businessId: string): Promise<GenerateWebsiteState> {
  const result = await generateAndSaveWebsite(businessId);
  return result.status === 'completed' ? undefined : { message: result.message };
}

export async function generateWebsiteAction(
  businessId: string,
  // Required by useActionState's (state, payload) signature but unused — no form fields, just a trigger button.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: GenerateWebsiteState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<GenerateWebsiteState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

  const result = await runWebsiteGeneration(businessId);
  if (result) return result;

  redirect(`/admin/businesses/${businessId}`);
}

// ---------------------------------------------------------------------------
// CTA config action
// ---------------------------------------------------------------------------

export type CtaFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

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
        if (
          data.secondaryType === 'external_url' &&
          !(data.secondaryValue && isHttpsUrl(data.secondaryValue.trim()))
        ) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['secondaryValue'], message: 'A valid https:// URL is required' });
        }
      }
    }
  });

/**
 * Update the primary/secondary CTA config on an existing preview in place.
 * Does not create a new preview version — this edits presentation config,
 * not generated content — so history/versioning is unaffected.
 */
export async function updatePreviewCtaAction(
  previewId: string,
  _prevState: CtaFormState,
  formData: FormData,
): Promise<CtaFormState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

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
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  const primary: PreviewCta = {
    type: data.primaryType,
    label: data.primaryType === 'none' ? '' : data.primaryLabel.trim(),
    ...(data.primaryValue?.trim() ? { value: data.primaryValue.trim() } : {}),
  };

  const secondary: PreviewCta | undefined =
    data.secondaryEnabled === 'on' && data.secondaryType
      ? {
          type: data.secondaryType,
          label: data.secondaryType === 'none' ? '' : (data.secondaryLabel ?? '').trim(),
          ...(data.secondaryValue?.trim() ? { value: data.secondaryValue.trim() } : {}),
        }
      : undefined;

  const cta: PreviewCtaConfig = { primary, ...(secondary ? { secondary } : {}) };

  let businessId = '';
  try {
    const preview = await getSitePreviewById(previewId);
    if (!preview) return { message: 'Preview not found' };
    businessId = preview.businessId;

    const content: PreviewContent = {
      ...preview.content,
      hero: { ...preview.content.hero, ctaText: primary.label || preview.content.hero.ctaText },
      cta,
    };

    PreviewContentSchema.parse(content);
    await putSitePreview({ ...preview, content, updatedAt: new Date().toISOString() });

    // An explicit CTA edit is a durable business decision (see the
    // `Business.cta` doc comment) — always persist it, unlike theme/photos
    // which only seed once and otherwise require an explicit override too.
    await updateBusiness(businessId, { cta });
  } catch (err) {
    console.error('Failed to update preview CTA:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save CTA changes. Please try again.' };
  }

  redirect(`/admin/businesses/${businessId}`);
}

function coerceOptional(value: string | null | undefined): string | undefined {
  return value?.trim() || undefined;
}

// ---------------------------------------------------------------------------
// Section content editing — inline admin editors on the business detail page
//
// Two categories, mirroring the split between durable business facts and
// per-version generated content:
//   - Preview-content sections write to the business's most recent
//     SitePreview.content in place (no new version) — same pattern as
//     updatePreviewCtaAction above.
//   - Business-level list sections (testimonials/faq/process) write to
//     Business fields that persist across regenerations, like theme/photos.
// ---------------------------------------------------------------------------

export type SectionContentFormState = { message?: string } | undefined;

const SECTION_HEADING_MAX = { headline: 120, subheadline: 300 };

function optionalHeading(headline: string, subheadline: string): { headline?: string; subheadline?: string } | undefined {
  const h = headline.trim();
  const s = subheadline.trim();
  if (!h && !s) return undefined;
  return { ...(h ? { headline: h } : {}), ...(s ? { subheadline: s } : {}) };
}

/**
 * Edits one section's content on the business's most recent preview, in
 * place — same shallow-spread-and-revalidate pattern as
 * `updatePreviewCtaAction`. Dispatches on `section` to parse the right form
 * fields; each branch only ever touches its own slice of `content`.
 */
export async function updateSectionContentAction(
  businessId: string,
  previewId: string,
  section: WebsiteSectionType,
  _prevState: SectionContentFormState,
  formData: FormData,
): Promise<SectionContentFormState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

  try {
    const preview = await getSitePreviewById(previewId);
    if (!preview) return { message: 'Preview not found' };
    if (preview.businessId !== businessId) return { message: 'Preview does not belong to this business' };

    const content: PreviewContent = { ...preview.content };

    switch (section) {
      case 'hero': {
        const headline = ((formData.get('headline') as string | null) ?? '').trim();
        const subheadline = ((formData.get('subheadline') as string | null) ?? '').trim();
        if (!headline || !subheadline) return { message: 'Headline and sub-headline are required.' };
        content.hero = {
          ...content.hero,
          headline: headline.slice(0, SECTION_HEADING_MAX.headline),
          subheadline: subheadline.slice(0, SECTION_HEADING_MAX.subheadline),
        };
        break;
      }
      case 'services': {
        const rows = parseIndexedList(formData, 'services', ['name', 'description']).filter((r) => r.name || r.description);
        if (rows.length === 0) return { message: 'At least one service is required.' };
        const services: PreviewService[] = rows.map((r) => ({
          name: r.name.slice(0, 100),
          description: r.description.slice(0, 500),
        }));
        content.services = services;
        content.servicesSection = optionalHeading(
          (formData.get('sectionHeadline') as string | null) ?? '',
          (formData.get('sectionSubheadline') as string | null) ?? '',
        );
        break;
      }
      case 'whyChooseUs': {
        const rows = parseIndexedList(formData, 'differentiators', ['title', 'description']).filter(
          (r) => r.title || r.description,
        );
        content.differentiators = rows.length
          ? rows.map((r) => ({ title: r.title.slice(0, 80), description: r.description.slice(0, 300) }))
          : undefined;
        content.whyChooseUsSection = optionalHeading((formData.get('sectionHeadline') as string | null) ?? '', '');
        break;
      }
      case 'about': {
        const tagline = ((formData.get('tagline') as string | null) ?? '').trim();
        const aboutText = ((formData.get('aboutText') as string | null) ?? '').trim();
        if (!tagline || !aboutText) return { message: 'Headline and description are required.' };
        const quote = ((formData.get('quote') as string | null) ?? '').trim();
        content.tagline = tagline.slice(0, 200);
        content.aboutText = aboutText.slice(0, 2000);
        content.aboutSection = quote ? { quote: quote.slice(0, 300) } : undefined;
        break;
      }
      case 'serviceAreas': {
        const rows = parseIndexedList(formData, 'serviceAreas', ['value']).map((r) => r.value).filter(Boolean);
        content.serviceAreas = rows.length ? rows.slice(0, 10).map((v) => v.slice(0, 80)) : undefined;
        content.serviceAreasSection = optionalHeading(
          (formData.get('sectionHeadline') as string | null) ?? '',
          (formData.get('sectionSubheadline') as string | null) ?? '',
        );
        break;
      }
      case 'gallery': {
        const rows = parseIndexedList(formData, 'galleryImages', ['url', 'caption']).filter((r) => r.url);
        const images: GalleryImage[] = rows
          .slice(0, 6)
          .map((r) => ({ url: r.url, ...(r.caption ? { caption: r.caption.slice(0, 200) } : {}) }));
        content.gallerySection = {
          ...optionalHeading(
            (formData.get('sectionHeadline') as string | null) ?? '',
            (formData.get('sectionSubheadline') as string | null) ?? '',
          ),
          images,
        };
        break;
      }
      case 'ctaBanner': {
        content.ctaBannerSection = optionalHeading(
          (formData.get('sectionHeadline') as string | null) ?? '',
          (formData.get('sectionSubheadline') as string | null) ?? '',
        );
        break;
      }
      case 'contact': {
        const phone = coerceOptional(formData.get('phone') as string | null);
        const email = coerceOptional(formData.get('email') as string | null);
        const address = coerceOptional(formData.get('address') as string | null);
        const hours = coerceOptional(formData.get('hours') as string | null);
        content.contact = { ...(phone ? { phone } : {}), ...(email ? { email } : {}), ...(address ? { address } : {}) };
        content.hours = hours;
        break;
      }
      default:
        return { message: `Section "${section}" has no content editor.` };
    }

    PreviewContentSchema.parse(content);
    await putSitePreview({ ...preview, content, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error(`Failed to update ${section} content:`, err instanceof Error ? err.message : err);
    return { message: 'Failed to save changes. Please try again.' };
  }

  // Carries the edited section back through the redirect via a query param
  // so the page can re-open it expanded — a Server Action redirect causes a
  // fresh render of the page, which would otherwise silently collapse the
  // section the admin was just editing.
  redirect(`/admin/businesses/${businessId}?expandedSection=${section}`);
}

const BUSINESS_LIST_FIELDS = ['testimonials', 'faqItems', 'processSteps'] as const;
export type BusinessListField = (typeof BUSINESS_LIST_FIELDS)[number];

/**
 * Edits one of the durable, manually-curated Business list fields
 * (testimonials/FAQ/process steps) — persists across regenerations, like
 * `theme`/photo-slot overrides. Never touches any preview record.
 *
 * `section` is which Website Sections row the caller rendered this editor
 * under — not necessarily the same identifier as `field` (the `reviews` row
 * uses `field: 'testimonials'`, see `BUSINESS_LIST_SECTIONS` in
 * SectionContentEditor.tsx), so it's passed explicitly rather than derived
 * from a static field→section map, ensuring the post-save redirect
 * re-expands whichever row the admin was actually editing.
 */
export async function updateBusinessListFieldAction(
  businessId: string,
  field: BusinessListField,
  section: WebsiteSectionType,
  _prevState: SectionContentFormState,
  formData: FormData,
): Promise<SectionContentFormState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };
  if (!(BUSINESS_LIST_FIELDS as readonly string[]).includes(field)) return { message: 'Unknown field' };

  try {
    let update: Partial<Business>;
    if (field === 'testimonials') {
      // This form only ever submits manually-entered rows — Google-sourced
      // testimonials (source: 'google') have no inputs in it at all (see
      // GoogleReviewsPanel). `updateBusiness`'s merge is shallow at the top
      // level, so writing `testimonials` here replaces the WHOLE array; the
      // business must be fetched first so existing Google reviews (and the
      // overall interleaved order — see TestimonialsOrderEditor.tsx) are
      // preserved rather than silently wiped out or reset by every save.
      const business = await getBusinessById(businessId);
      if (!business) return { message: 'Business not found' };
      const rows = parseIndexedList(formData, 'testimonials', ['id', 'author', 'quote', 'rating']).filter(
        (r) => r.author && r.quote,
      );
      const manualTestimonials = rows.map((r) => {
        const ratingNum = Number(r.rating);
        const rating = r.rating && Number.isInteger(ratingNum) && ratingNum >= 1 && ratingNum <= 5 ? ratingNum : undefined;
        return {
          // A blank id (the hidden field's default for a row added this
          // submission) means "brand new" — mint a real one now, the same
          // moment every other manual testimonial gets its id.
          id: r.id || crypto.randomUUID(),
          author: r.author.slice(0, 100),
          quote: r.quote.slice(0, 500),
          source: 'manual' as const,
          ...(rating !== undefined ? { rating } : {}),
        };
      });
      update = {
        testimonials: mergeTestimonialsPreservingOrder(business.testimonials ?? [], {
          source: 'manual',
          items: manualTestimonials,
        }),
      };
    } else if (field === 'faqItems') {
      const rows = parseIndexedList(formData, 'faq', ['question', 'answer']).filter((r) => r.question && r.answer);
      update = { faqItems: rows.map((r) => ({ question: r.question.slice(0, 200), answer: r.answer.slice(0, 1000) })) };
    } else {
      const rows = parseIndexedList(formData, 'process', ['title', 'description']).filter((r) => r.title && r.description);
      update = { processSteps: rows.map((r) => ({ title: r.title.slice(0, 80), description: r.description.slice(0, 300) })) };
    }

    await updateBusiness(businessId, update);
  } catch (err) {
    console.error(`Failed to update ${field}:`, err instanceof Error ? err.message : err);
    return { message: 'Failed to save changes. Please try again.' };
  }

  redirect(`/admin/businesses/${businessId}?expandedSection=${section}`);
}

// ---------------------------------------------------------------------------
// Testimonials — Google Reviews (Stage 12 follow-on) and reordering
// GoogleReviewsPanel.tsx / TestimonialsOrderEditor.tsx
//
// None of these redirect, matching the PhotoManager convention above: each
// is dispatched imperatively via useActionState so the client can apply the
// returned `testimonials` array optimistically without a full page reload.
// ---------------------------------------------------------------------------

export type TestimonialsState = { message?: string; testimonials?: BusinessTestimonial[] } | undefined;

/**
 * Manual "Import/Refresh Google Reviews" — the automatic fetch only runs
 * once, at Google Places import time (see discover/actions.ts), so this is
 * the only path for a business imported before this feature shipped, or for
 * picking up new reviews Google has accumulated since the last fetch.
 *
 * Preserves each review's `hidden` state across a refresh (matched by
 * `googleReviewId`, which doubles as `id` for Google-sourced testimonials —
 * see lib/google-places/reviews.ts) — otherwise every refresh would
 * silently un-hide anything an admin had previously hidden. Also preserves
 * the overall interleaved order via `mergeTestimonialsPreservingOrder` —
 * without it, a refresh would reset any custom ordering an admin set up via
 * TestimonialsOrderEditor back to "all Google reviews together."
 */
export async function importGoogleReviewsAction(
  businessId: string,
  // Required by useActionState's (state, payload) signature but unused — no form fields, just a trigger button.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: TestimonialsState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<TestimonialsState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

  const business = await getBusinessById(businessId);
  if (!business) return { message: 'Business not found' };
  if (!business.googlePlaceId) {
    return { message: 'This business has no Google Place ID — import it via Discover first.' };
  }

  let fresh: BusinessTestimonial[];
  try {
    fresh = await fetchAndMapGoogleReviews(business.googlePlaceId);
  } catch (err) {
    console.error('Failed to import Google reviews:', err instanceof Error ? err.message : err);
    return { message: 'Failed to fetch Google reviews. Please try again.' };
  }

  const existing = business.testimonials ?? [];
  const priorHiddenById = new Map(existing.filter((t) => t.source === 'google').map((t) => [t.id, t.hidden ?? false]));
  const googleTestimonials = fresh.map((t) => ({ ...t, hidden: priorHiddenById.get(t.id) ?? false }));

  const testimonials = mergeTestimonialsPreservingOrder(existing, { source: 'google', items: googleTestimonials });

  try {
    await updateBusiness(businessId, {
      testimonials,
      // ReviewsSection renders testimonials underneath the rating summary
      // (see app/b/[slug]/template/ReviewsSection.tsx) — there is no
      // separate `testimonials` section to enable.
      ...(googleTestimonials.length > 0 ? { websiteSections: enableWebsiteSection(business, 'reviews') } : {}),
    });
  } catch (err) {
    console.error('Failed to save imported Google reviews:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save imported reviews. Please try again.' };
  }

  return { testimonials };
}

const ToggleGoogleReviewSchema = z.object({ googleReviewId: z.string().min(1) });

/** Hides or shows one Google-sourced review without touching its content. */
export async function toggleGoogleReviewVisibilityAction(
  businessId: string,
  _prevState: TestimonialsState,
  formData: FormData,
): Promise<TestimonialsState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

  const parsed = ToggleGoogleReviewSchema.safeParse({ googleReviewId: formData.get('googleReviewId') });
  if (!parsed.success) return { message: 'Missing review to toggle.' };

  const business = await getBusinessById(businessId);
  if (!business) return { message: 'Business not found' };

  const testimonials = (business.testimonials ?? []).map((t) =>
    t.source === 'google' && t.googleReviewId === parsed.data.googleReviewId ? { ...t, hidden: !t.hidden } : t,
  );

  try {
    await updateBusiness(businessId, { testimonials });
  } catch (err) {
    console.error('Failed to toggle Google review visibility:', err instanceof Error ? err.message : err);
    return { message: 'Failed to update review visibility. Please try again.' };
  }

  return { testimonials };
}

const ReorderTestimonialsSchema = z.object({ order: z.array(z.string().min(1)).min(1) });

/**
 * Reorders the FULL testimonials list — manual and Google-sourced entries
 * interleaved freely, e.g. inserting a manual testimonial between two
 * Google reviews — driven by TestimonialsOrderEditor.tsx's up/down arrows.
 * Content and hidden-state are untouched; only array position changes.
 */
export async function reorderTestimonialsAction(
  businessId: string,
  _prevState: TestimonialsState,
  formData: FormData,
): Promise<TestimonialsState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

  const parsed = ReorderTestimonialsSchema.safeParse({ order: formData.getAll('order') });
  if (!parsed.success) return { message: 'Missing new order.' };

  const business = await getBusinessById(businessId);
  if (!business) return { message: 'Business not found' };

  const existing = business.testimonials ?? [];
  const byId = new Map(existing.map((t) => [t.id, t]));
  const reordered = parsed.data.order
    .map((id) => byId.get(id))
    .filter((t): t is BusinessTestimonial => t !== undefined);
  // Defensive: never silently drop a testimonial the client's submitted
  // order somehow omitted (e.g. a stale snapshot) — append it at the end.
  const includedIds = new Set(reordered.map((t) => t.id));
  const missing = existing.filter((t) => !includedIds.has(t.id));
  const testimonials = [...reordered, ...missing];

  try {
    await updateBusiness(businessId, { testimonials });
  } catch (err) {
    console.error('Failed to reorder testimonials:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save new order. Please try again.' };
  }

  return { testimonials };
}

// ---------------------------------------------------------------------------
// Cascade delete action
// ---------------------------------------------------------------------------

/**
 * Permanently delete a business and all downstream records:
 *   SitePreviews, ScanEvents, Postcards.
 *
 * Requires an active admin session. Redirects to /admin/businesses on success.
 */
export async function deleteBusinessAction(businessId: string): Promise<{ error: string } | void> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const business = await getBusinessById(businessId);
  if (!business) return { error: 'Business not found' };

  // Fetch all downstream records concurrently
  const [previews, scans, postcards, claims] = await Promise.all([
    listPreviewsForBusiness(businessId),
    listScansForBusiness(businessId),
    listPostcardsForBusiness(businessId),
    listClaimsForBusiness(businessId),
  ]);

  // Delete downstream records concurrently. Claims are included here for
  // consistency with the existing cascade (Stage 17) — this is an explicit
  // admin-destructive action, not a claim-lifecycle event, so it does not
  // conflict with "claim history is preserved during normal operation."
  await Promise.all([
    ...previews.map((p) => deletePreviewById(p.previewId)),
    ...scans.map((s) => deleteScanEventById(s.scanId)),
    ...postcards.map((p) => deletePostcardById(p.postcardId)),
    ...claims.map((c) => deleteClaimById(c.claimId)),
  ]);

  // Delete the business record last
  await deleteBusinessById(businessId);

  redirect('/admin/businesses');
}

// ---------------------------------------------------------------------------
// Claim link + ownership recovery (Stage 17)
// ---------------------------------------------------------------------------

export interface ClaimLinkResult {
  error?: string;
  /** The raw claim token — shown once, never persisted, never retrievable again. */
  rawToken?: string;
  claimId?: string;
}

/**
 * Issues a new claim token for this business. The raw token is returned
 * once in this response for the admin to copy into the postcard-generation
 * pipeline — it is never written to storage; only its hash is (see
 * `lib/claim/token.ts`).
 */
export async function generateClaimLinkAction(businessId: string): Promise<ClaimLinkResult> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const business = await getBusinessById(businessId);
  if (!business) return { error: 'Business not found' };

  const { rawToken, tokenHash } = await generateAndHashClaimToken();
  const claim = createClaim({ businessId, tokenHash });
  await putClaim(claim);

  return { rawToken, claimId: claim.claimId };
}

export async function revokeClaimAction(claimId: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const revoked = await revokeClaim(claimId, 'Revoked by admin');
  if (!revoked) return { error: 'This claim can no longer be revoked (already consumed, expired, or revoked).' };
  return {};
}

export interface ReleaseOwnershipResult {
  error?: string;
  releasedOwnerEmail?: string;
}

/**
 * Exceptional admin recovery workflow (Stage 17): clears ownership on a
 * business that was claimed but never activated, without touching the
 * original (terminal) Claim record. Never automatic — the admin is expected
 * to follow up with `generateClaimLinkAction` to let a legitimate claimant
 * try again.
 */
export async function releaseOwnershipAction(businessId: string): Promise<ReleaseOwnershipResult> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const business = await getBusinessById(businessId);
  if (!business) return { error: 'Business not found' };
  if (!business.ownerUserId) return { error: 'This business is not currently claimed.' };

  const ownerProfile = await adminGetCustomerProfileBySub(business.ownerUserId);
  const released = await releaseOwnership(businessId);
  if (!released) return { error: 'This business is not currently claimed.' };

  return { releasedOwnerEmail: ownerProfile?.email ?? undefined };
}

// ---------------------------------------------------------------------------
// Website section configuration (Stage 11.x)
// ---------------------------------------------------------------------------

export type SectionsFormState = { message?: string } | undefined;

// `persistWebsiteSections` (reconstructs and validates the full 15-entry
// config, force-enabling required sections, from `enabled_{type}`/
// `order_{type}` form fields) now lives in `lib/website-sections/persist.ts`
// — extracted (Stage 19) so the new customer-scoped sections action shares
// the identical validated write path instead of a second copy of this
// reconstruction logic. Shared here by `saveWebsiteSectionsAction`
// (redirects — the wizard's "Finish setup" step) and
// `autoSaveWebsiteSectionsAction` (no redirect — every checkbox/reorder
// interaction on the business detail page persists immediately).

export async function saveWebsiteSectionsAction(
  businessId: string,
  _prevState: SectionsFormState,
  formData: FormData,
): Promise<SectionsFormState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

  const result = await persistWebsiteSections(businessId, formData);
  if (result) return result;

  redirect(`/admin/businesses/${businessId}`);
}

/**
 * Auto-save variant used by the business detail page: every checkbox toggle
 * or reorder click calls this immediately (no manual "Save Sections" step),
 * and — unlike `saveWebsiteSectionsAction` — it never redirects, since the
 * client's own optimistic state already reflects the change; a redirect
 * would force a full page reload on every single click. This is also what
 * fixes enabling a section (e.g. FAQ) and filling in its content in one
 * sitting: previously, checking the box only updated local client state
 * until a separate "Save Sections" click, so saving a section's content
 * (a different action, which does redirect) reloaded the page with the
 * checkbox still reflecting whatever was last actually persisted — unchecked.
 */
export async function autoSaveWebsiteSectionsAction(
  businessId: string,
  _prevState: SectionsFormState,
  formData: FormData,
): Promise<SectionsFormState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

  return persistWebsiteSections(businessId, formData);
}

/**
 * The onboarding wizard's final step: saves the chosen section configuration
 * and immediately generates the first AI draft in one click — matching the
 * intended workflow (add business → wizard → generate website), rather than
 * saving sections and leaving the admin to separately find and click
 * "Generate Website" on the detail page afterward.
 */
export async function finishOnboardingAction(
  businessId: string,
  _prevState: GenerateWebsiteState,
  formData: FormData,
): Promise<GenerateWebsiteState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

  const sectionsResult = await persistWebsiteSections(businessId, formData);
  if (sectionsResult) return sectionsResult;

  const generationResult = await runWebsiteGeneration(businessId);
  if (generationResult) return generationResult;

  redirect(`/admin/businesses/${businessId}`);
}

/**
 * Deterministic, rule-based recommendation — no AI (see
 * `lib/website-sections/recommend.ts`). Uses the business's most recent
 * preview for content-derived signals when one exists.
 */
export async function applyRecommendedSectionsAction(businessId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const business = await getBusinessById(businessId);
  if (!business) throw new Error('Business not found');

  const previews = await listPreviewsForBusiness(businessId);
  const content = previews[0]?.content;

  const config = recommendWebsiteSections({
    business,
    content,
    hasCta: hasResolvableCta(business, content),
  });

  await updateBusiness(businessId, { websiteSections: config });
  redirect(`/admin/businesses/${businessId}`);
}

/** Restores the catalog's default configuration — no business-data rules applied. */
export async function resetWebsiteSectionsAction(businessId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const business = await getBusinessById(businessId);
  if (!business) throw new Error('Business not found');

  await updateBusiness(businessId, { websiteSections: createDefaultWebsiteSectionsConfig() });
  redirect(`/admin/businesses/${businessId}`);
}

// ---------------------------------------------------------------------------
// Domain visibility (Stage 19.x, Part 2) — read-only status + a manual
// refresh. Domain assignment/removal itself is a customer/onboarding-side
// operation; admin does not casually change ownership here.
// ---------------------------------------------------------------------------

export async function refreshDomainStatusAction(businessId: string, normalizedDomain: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  await reconcileDomainConnection(normalizedDomain);
  redirect(`/admin/businesses/${businessId}`);
}

/**
 * Testing-only utility — fully tears down this business's domain connection
 * (Vercel attachment + the DynamoDB record) so the same real domain can be
 * reattached to a different business, e.g. for repeated dev walkthroughs
 * without needing a fresh domain each time. Not a customer-facing
 * capability; see `lib/domains/disconnect.ts`.
 */
export async function disconnectDomainForTestingAction(businessId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  await disconnectDomainConnectionForTesting(businessId);
  redirect(`/admin/businesses/${businessId}`);
}
