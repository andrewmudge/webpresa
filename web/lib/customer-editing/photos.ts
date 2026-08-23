import 'server-only';
import { z } from 'zod';
import type { Business } from '@/domain/models/business';
import type { HeroStyle, PreviewTheme } from '@/domain/models/site-preview';
import { PreviewThemeSchema } from '@/domain/schemas/site-preview.schema';
import { getBusinessById, putBusiness, updateBusiness } from '@/lib/db/businesses';
import { ensureDraftPreview, putSitePreview } from '@/lib/db/site-previews';
import { checkHeroPhotoDimensions } from '@/lib/image/hero-dimensions';
import {
  uploadBusinessAsset,
  uploadBusinessAssetWithBuffer,
  appendBusinessPhotos,
  assetKeyFromUrl,
  regenerateBusinessFavicon,
  regenerateFaviconFromLogoUrl,
} from '@/lib/s3/business-assets';
import { deleteAsset } from '@/lib/s3/assets';
import { UploadValidationError, validateImageUpload } from '@/lib/s3/upload-validation';

/**
 * Customer-scoped counterpart to the admin's `updatePhotosAction` /
 * `addBusinessPhotosAction` / `deleteBusinessPhotoAction`. Same S3 upload
 * path (`uploadBusinessAsset`/`appendBusinessPhotos`) and the same
 * slot-override + theme dual-write behavior — but the live-apply step
 * always lands on a draft (`ensureDraftPreview`), never a direct patch onto
 * an already-published preview.
 *
 * Photo uploads are validated server-side by `uploadBusinessAsset` itself
 * (Stage 25 — Security Hardening: real image-decode validation, a size
 * cap, and an allowlisted content type never trusted from the browser —
 * see `lib/s3/upload-validation.ts`). What this module adds on top is
 * scope: every upload key is written under a `businessId` the caller
 * already proved ownership of via `requireBusinessOwnership()` before
 * calling any function here.
 */
const MAX_BUSINESS_PHOTOS = 6;

export type CustomerPhotoState =
  | { message?: string; photoUrls?: string[]; logoUrl?: string; faviconUrl?: string; faviconSource?: 'auto' | 'manual' }
  | undefined;

export async function addCustomerBusinessPhotos(businessId: string, formData: FormData): Promise<CustomerPhotoState> {
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
    if (err instanceof UploadValidationError) return { message: err.message };
    console.error('Failed to add customer business photos:', err instanceof Error ? err.message : err);
    return { message: 'Failed to upload photos. Please try again.' };
  }
}

function resolveThemePhotoPatch(value: string | undefined): { apply: boolean; url: string | undefined } {
  if (!value) return { apply: false, url: undefined };
  if (value === 'none') return { apply: true, url: undefined };
  return { apply: true, url: value };
}

async function dualWriteClearedSlots(
  businessId: string,
  cleared: { hero: boolean; heroMobile: boolean; about: boolean; whyChooseUs: boolean; services: boolean },
): Promise<void> {
  const hero = resolveThemePhotoPatch(cleared.hero ? 'none' : undefined);
  const heroMobile = resolveThemePhotoPatch(cleared.heroMobile ? 'none' : undefined);
  const about = resolveThemePhotoPatch(cleared.about ? 'none' : undefined);
  const whyChooseUs = resolveThemePhotoPatch(cleared.whyChooseUs ? 'none' : undefined);
  const services = resolveThemePhotoPatch(cleared.services ? 'none' : undefined);
  if (!(hero.apply || heroMobile.apply || about.apply || whyChooseUs.apply || services.apply)) return;

  const draft = await ensureDraftPreview(businessId);
  if (!draft) return;
  const heroStyle: HeroStyle | undefined = hero.apply ? 'illustration' : undefined;
  const theme: PreviewTheme = {
    ...draft.theme,
    ...(hero.apply ? { heroImageUrl: hero.url, heroStyle } : {}),
    ...(heroMobile.apply ? { heroImageUrlMobile: heroMobile.url } : {}),
    ...(about.apply ? { aboutSectionImageUrl: about.url } : {}),
    ...(whyChooseUs.apply ? { aboutImageUrl: whyChooseUs.url } : {}),
    ...(services.apply ? { servicesImageUrl: services.url } : {}),
  };
  PreviewThemeSchema.parse(theme);
  await putSitePreview({ ...draft, theme, updatedAt: new Date().toISOString() });
}

export async function deleteCustomerBusinessPhoto(businessId: string, photoUrl: string): Promise<CustomerPhotoState> {
  if (!photoUrl) return { message: 'No photo specified.' };

  try {
    const existing = await getBusinessById(businessId);
    if (!existing) return { message: 'Business not found' };

    const existingPhotoUrls = existing.photoUrls ?? [];
    if (!existingPhotoUrls.includes(photoUrl)) {
      return { photoUrls: existingPhotoUrls, logoUrl: existing.logoUrl, faviconUrl: existing.faviconUrl, faviconSource: existing.faviconSource };
    }

    const photoUrls = existingPhotoUrls.filter((u) => u !== photoUrl);
    const cleared = {
      hero: existing.heroPhotoUrl === photoUrl,
      heroMobile: existing.heroPhotoUrlMobile === photoUrl,
      about: existing.aboutPhotoUrl === photoUrl,
      whyChooseUs: existing.whyChooseUsPhotoUrl === photoUrl,
      services: existing.servicesPhotoUrl === photoUrl,
    };
    const logoCleared = existing.logoUrl === photoUrl;
    // See the identical comment in the admin's deleteBusinessPhotoAction —
    // a manual favicon is never cleared by a logo deletion, only an auto one.
    const faviconCleared = logoCleared && existing.faviconSource !== 'manual';

    await putBusiness({
      ...existing,
      photoUrls,
      heroPhotoUrl: cleared.hero ? undefined : existing.heroPhotoUrl,
      heroPhotoUrlMobile: cleared.heroMobile ? undefined : existing.heroPhotoUrlMobile,
      aboutPhotoUrl: cleared.about ? undefined : existing.aboutPhotoUrl,
      whyChooseUsPhotoUrl: cleared.whyChooseUs ? undefined : existing.whyChooseUsPhotoUrl,
      servicesPhotoUrl: cleared.services ? undefined : existing.servicesPhotoUrl,
      logoUrl: logoCleared ? undefined : existing.logoUrl,
      faviconUrl: faviconCleared ? undefined : existing.faviconUrl,
      updatedAt: new Date().toISOString(),
    });

    const key = assetKeyFromUrl(photoUrl);
    if (key) {
      await deleteAsset(key).catch((err) => {
        console.error('Failed to delete S3 object for removed photo:', err instanceof Error ? err.message : err);
      });
    }

    await dualWriteClearedSlots(businessId, cleared);

    return {
      photoUrls,
      logoUrl: logoCleared ? undefined : existing.logoUrl,
      faviconUrl: faviconCleared ? undefined : existing.faviconUrl,
      faviconSource: existing.faviconSource,
    };
  } catch (err) {
    console.error('Failed to delete customer business photo:', err instanceof Error ? err.message : err);
    return { message: 'Failed to delete photo. Please try again.' };
  }
}

const SLOT_UPLOAD_FIELDS = {
  heroPhotoUrl: 'heroPhotoFile',
  heroPhotoUrlMobile: 'heroPhotoFileMobile',
  aboutPhotoUrl: 'aboutPhotoFile',
  whyChooseUsPhotoUrl: 'whyChooseUsPhotoFile',
  servicesPhotoUrl: 'servicesPhotoFile',
} as const;

const UpdatePhotoSlotsSchema = z.object({
  heroPhotoUrl: z.string().optional(),
  heroPhotoUrlMobile: z.string().optional(),
  aboutPhotoUrl: z.string().optional(),
  whyChooseUsPhotoUrl: z.string().optional(),
  servicesPhotoUrl: z.string().optional(),
  logoPhotoUrl: z.string().optional(),
});

function resolveLogoUrl(picked: string | undefined, existingLogoUrl: string | undefined): string | undefined {
  if (!picked) return existingLogoUrl;
  if (picked === 'none') return undefined;
  return picked;
}

export async function updateCustomerPhotoSlots(businessId: string, formData: FormData): Promise<CustomerPhotoState> {
  const raw = {
    heroPhotoUrl: (formData.get('heroPhotoUrl') as string) || undefined,
    heroPhotoUrlMobile: (formData.get('heroPhotoUrlMobile') as string) || undefined,
    aboutPhotoUrl: (formData.get('aboutPhotoUrl') as string) || undefined,
    whyChooseUsPhotoUrl: (formData.get('whyChooseUsPhotoUrl') as string) || undefined,
    servicesPhotoUrl: (formData.get('servicesPhotoUrl') as string) || undefined,
    logoPhotoUrl: (formData.get('logoPhotoUrl') as string) || undefined,
  };
  const parsed = UpdatePhotoSlotsSchema.safeParse(raw);
  if (!parsed.success) return { message: 'Invalid photo selection.' };
  const data = parsed.data;

  try {
    const existing = await getBusinessById(businessId);
    if (!existing) return { message: 'Business not found' };

    let photoUrls = existing.photoUrls ?? [];
    const slotOverrides: Partial<Record<keyof typeof SLOT_UPLOAD_FIELDS, string>> = {};
    for (const [slotKey, fieldName] of Object.entries(SLOT_UPLOAD_FIELDS) as [keyof typeof SLOT_UPLOAD_FIELDS, string][]) {
      const file = formData.get(fieldName);
      if (file instanceof File && file.size > 0) {
        if (photoUrls.length >= MAX_BUSINESS_PHOTOS) {
          return { message: `Maximum ${MAX_BUSINESS_PHOTOS} photos allowed — remove one in Photos first.` };
        }
        const url = await uploadBusinessAsset(businessId, file, `photos/${crypto.randomUUID()}`);
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

    const hero = resolveThemePhotoPatch(heroPhotoUrl);
    const heroMobile = resolveThemePhotoPatch(heroPhotoUrlMobile);
    const about = resolveThemePhotoPatch(aboutPhotoUrl);
    const whyChooseUs = resolveThemePhotoPatch(whyChooseUsPhotoUrl);
    const services = resolveThemePhotoPatch(servicesPhotoUrl);

    if (hero.apply || heroMobile.apply || about.apply || whyChooseUs.apply || services.apply) {
      const draft = await ensureDraftPreview(businessId);
      if (draft) {
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
          ...draft.theme,
          ...(hero.apply ? { heroImageUrl: hero.url, heroStyle } : {}),
          ...(heroMobile.apply ? { heroImageUrlMobile: heroMobile.url } : {}),
          ...(about.apply ? { aboutSectionImageUrl: about.url } : {}),
          ...(whyChooseUs.apply ? { aboutImageUrl: whyChooseUs.url } : {}),
          ...(services.apply ? { servicesImageUrl: services.url } : {}),
        };
        PreviewThemeSchema.parse(theme);
        await putSitePreview({ ...draft, theme, updatedAt: new Date().toISOString() });
      }
    }

    return { photoUrls };
  } catch (err) {
    if (err instanceof UploadValidationError) return { message: err.message };
    console.error('Failed to update customer photo slots:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save changes. Please try again.' };
  }
}

// ---------------------------------------------------------------------------
// Narrow, single-slot, partial-merge variants (Website page card merges).
//
// `updateCustomerPhotoSlots` above was safe only because its one caller (the
// standalone `/design` route, submitting all six slots in one form) always
// round-tripped every field's `defaultValue` correctly even when unchanged —
// a slot the customer didn't touch was still resubmitted with its current
// value. Photo slots moved into their own content card (Hero, About, Why
// Choose Us, Services) in Stage 19.A, and `/design` itself now just
// redirects into `/website` — see implementation.md, Stage 19.A. Each
// card's form only ever contains ITS OWN slot field(s); reusing the
// all-in-one function with a FormData missing every other slot's key would
// resolve those absent fields to `undefined` and silently clear them via
// `putBusiness`'s full-record write. These functions use `updateBusiness()`
// (a genuine partial merge) instead, and only ever include the one key they
// actually resolved — a slot nothing changed on is simply left out of the
// update, not explicitly nulled. `updateCustomerPhotoSlots` itself is left
// completely untouched — it has no remaining caller in the UI after the
// `/design` removal, but stays in place rather than being deleted alongside
// it, out of scope for this stage's cleanup.
// ---------------------------------------------------------------------------

type SlotBusinessField = 'heroPhotoUrl' | 'heroPhotoUrlMobile' | 'aboutPhotoUrl' | 'whyChooseUsPhotoUrl' | 'servicesPhotoUrl';
type SlotThemeField = 'heroImageUrl' | 'heroImageUrlMobile' | 'aboutSectionImageUrl' | 'aboutImageUrl' | 'servicesImageUrl';

/**
 * Resolves and applies exactly one photo slot from a FormData that may
 * contain nothing else relevant. Returns without writing anything at all
 * when the slot was left on "Auto" (nothing to change) — not even an empty
 * `updateBusiness()` call.
 */
async function applySlotUpdate(
  businessId: string,
  formData: FormData,
  formFieldName: string,
  uploadFieldName: string,
  businessField: SlotBusinessField,
  themeField: SlotThemeField,
  options?: { recomputeHeroStyle?: boolean },
): Promise<CustomerPhotoState> {
  try {
    const existing = await getBusinessById(businessId);
    if (!existing) return { message: 'Business not found' };

    let photoUrls = existing.photoUrls ?? [];
    let resolvedUrl: string | undefined;
    let changed = false;
    let uploadedNew = false;

    const file = formData.get(uploadFieldName);
    if (file instanceof File && file.size > 0) {
      if (photoUrls.length >= MAX_BUSINESS_PHOTOS) {
        return { message: `Maximum ${MAX_BUSINESS_PHOTOS} photos allowed — remove one in Photos first.` };
      }
      const url = await uploadBusinessAsset(businessId, file, `photos/${crypto.randomUUID()}`);
      photoUrls = [...photoUrls, url];
      resolvedUrl = url;
      changed = true;
      uploadedNew = true;
    } else {
      const picked = (formData.get(formFieldName) as string) || undefined;
      if (picked === 'none') {
        resolvedUrl = undefined;
        changed = true;
      } else if (picked) {
        resolvedUrl = picked;
        changed = true;
      }
      // picked is undefined (left on "Auto") — changed stays false, nothing to do.
    }

    if (!changed) return { photoUrls: existing.photoUrls ?? [] };

    const businessUpdate: Partial<Business> = { [businessField]: resolvedUrl, ...(uploadedNew ? { photoUrls } : {}) };
    await updateBusiness(businessId, businessUpdate);

    const draft = await ensureDraftPreview(businessId);
    if (draft) {
      const themeUpdate: Partial<PreviewTheme> = { [themeField]: resolvedUrl };
      if (options?.recomputeHeroStyle) {
        if (!resolvedUrl) {
          themeUpdate.heroStyle = 'illustration';
        } else {
          const dimensionCheck = await checkHeroPhotoDimensions(resolvedUrl);
          themeUpdate.heroStyle = dimensionCheck?.isFullBleedEligible ? 'image' : 'imageSplit';
        }
      }
      const theme: PreviewTheme = { ...draft.theme, ...themeUpdate };
      PreviewThemeSchema.parse(theme);
      await putSitePreview({ ...draft, theme, updatedAt: new Date().toISOString() });
    }

    return { photoUrls };
  } catch (err) {
    if (err instanceof UploadValidationError) return { message: err.message };
    console.error(`Failed to update ${businessField}:`, err instanceof Error ? err.message : err);
    return { message: 'Failed to save changes. Please try again.' };
  }
}

/** Hero card — desktop and mobile hero photo slots (two independent, sequential slot updates). */
export async function updateCustomerHeroPhotoSlots(businessId: string, formData: FormData): Promise<CustomerPhotoState> {
  const desktop = await applySlotUpdate(businessId, formData, 'heroPhotoUrl', 'heroPhotoFile', 'heroPhotoUrl', 'heroImageUrl', {
    recomputeHeroStyle: true,
  });
  if (desktop?.message) return desktop;
  return applySlotUpdate(businessId, formData, 'heroPhotoUrlMobile', 'heroPhotoFileMobile', 'heroPhotoUrlMobile', 'heroImageUrlMobile');
}

/** About card — About section photo slot. */
export async function updateCustomerAboutPhotoSlot(businessId: string, formData: FormData): Promise<CustomerPhotoState> {
  return applySlotUpdate(businessId, formData, 'aboutPhotoUrl', 'aboutPhotoFile', 'aboutPhotoUrl', 'aboutSectionImageUrl');
}

/**
 * "Why choose us" card — its photo slot. Note the existing, pre-established
 * field-name mismatch this preserves rather than "fixes": `Business.whyChooseUsPhotoUrl`
 * maps to `PreviewTheme.aboutImageUrl` (not `aboutSectionImageUrl`, which is
 * the true About-section image) — that's the schema's existing naming from
 * before this stage, unrelated to this change.
 */
export async function updateCustomerWhyChooseUsPhotoSlot(businessId: string, formData: FormData): Promise<CustomerPhotoState> {
  return applySlotUpdate(businessId, formData, 'whyChooseUsPhotoUrl', 'whyChooseUsPhotoFile', 'whyChooseUsPhotoUrl', 'aboutImageUrl');
}

/** Services card — Services section photo slot. */
export async function updateCustomerServicesPhotoSlot(businessId: string, formData: FormData): Promise<CustomerPhotoState> {
  return applySlotUpdate(businessId, formData, 'servicesPhotoUrl', 'servicesPhotoFile', 'servicesPhotoUrl', 'servicesImageUrl');
}

/**
 * Logo card — no theme dual-write (logo isn't a `SitePreview.theme` field).
 * Stage 19.A added a direct-upload option (`logoPhotoFile`), uploaded under
 * its own `logo/` prefix rather than the shared `photos/` one `photoUrls`
 * pulls from — a logo isn't "a photo of your business" in the Gallery
 * section's sense, so a freshly uploaded logo intentionally does NOT get
 * appended to `Business.photoUrls` the way a hero/about/etc. slot upload
 * does in `applySlotUpdate` above.
 */
export async function updateCustomerLogo(businessId: string, formData: FormData): Promise<CustomerPhotoState> {
  try {
    const existing = await getBusinessById(businessId);
    if (!existing) return { message: 'Business not found' };

    const file = formData.get('logoPhotoFile');
    let logoUrl: string | undefined;
    let logoBuffer: Buffer | undefined;
    if (file instanceof File && file.size > 0) {
      ({ url: logoUrl, buffer: logoBuffer } = await uploadBusinessAssetWithBuffer(businessId, file, `logo/${crypto.randomUUID()}`));
    } else {
      const picked = (formData.get('logoPhotoUrl') as string) || undefined;
      logoUrl = resolveLogoUrl(picked, existing.logoUrl);
    }

    if (logoUrl === existing.logoUrl) return { logoUrl, faviconUrl: existing.faviconUrl, faviconSource: existing.faviconSource };

    // Regenerate the browser-tab icon from the new logo, unless a manual
    // override is on file — see Business.faviconSource's doc comment.
    let faviconUrl = existing.faviconUrl;
    if (existing.faviconSource !== 'manual') {
      faviconUrl = logoBuffer
        ? await regenerateBusinessFavicon(businessId, logoBuffer)
        : logoUrl
          ? await regenerateFaviconFromLogoUrl(businessId, logoUrl)
          : undefined;
    }
    const faviconSource = existing.faviconSource === 'manual' ? 'manual' : 'auto';

    await updateBusiness(businessId, { logoUrl, faviconUrl, faviconSource });
    return { logoUrl, faviconUrl, faviconSource };
  } catch (err) {
    if (err instanceof UploadValidationError) return { message: err.message };
    console.error('Failed to update customer logo:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save changes. Please try again.' };
  }
}

/**
 * Uploads a manual "Browser tab icon" override — customer-scoped
 * counterpart to `updateBusinessFaviconAction`. Runs through the same
 * square/transparent-pad pipeline as an auto-derived one, and marks
 * `faviconSource: 'manual'` so future logo changes never overwrite it.
 */
export async function updateCustomerFavicon(businessId: string, formData: FormData): Promise<CustomerPhotoState> {
  const file = formData.get('favicon');
  if (!(file instanceof File) || file.size === 0) return { message: 'Choose an image to upload.' };

  try {
    const existing = await getBusinessById(businessId);
    if (!existing) return { message: 'Business not found' };

    const { buffer } = await validateImageUpload(file);
    const faviconUrl = await regenerateBusinessFavicon(businessId, buffer);
    await updateBusiness(businessId, { faviconUrl, faviconSource: 'manual' });

    return { faviconUrl, faviconSource: 'manual' };
  } catch (err) {
    if (err instanceof UploadValidationError) return { message: err.message };
    console.error('Failed to update customer favicon:', err instanceof Error ? err.message : err);
    return { message: 'Failed to upload icon. Please try again.' };
  }
}

/**
 * Clears a manual "Browser tab icon" override and regenerates it fresh
 * from the current logo immediately — customer-scoped counterpart to
 * `resetBusinessFaviconAction`.
 */
export async function resetCustomerFavicon(businessId: string): Promise<CustomerPhotoState> {
  try {
    const existing = await getBusinessById(businessId);
    if (!existing) return { message: 'Business not found' };

    const faviconUrl = existing.logoUrl ? await regenerateFaviconFromLogoUrl(businessId, existing.logoUrl) : undefined;
    await updateBusiness(businessId, { faviconUrl, faviconSource: 'auto' });

    return { faviconUrl, faviconSource: 'auto' };
  } catch (err) {
    console.error('Failed to reset customer favicon:', err instanceof Error ? err.message : err);
    return { message: 'Failed to reset icon. Please try again.' };
  }
}
