'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { INDUSTRIES } from '@/domain/constants/industries';
import { BRAND_TONES } from '@/domain/constants/brand-tone';
import { THEME_NAMES } from '@/domain/constants/themes';
import { BUSINESS_SOURCES, BUSINESS_STATUSES } from '@/domain/models/business';
import { createBusiness, type CreateBusinessInput } from '@/domain/factories/business.factory';
import { putBusiness, resolveUniqueSlug, getBusinessById } from '@/lib/db/businesses';
import { putAsset } from '@/lib/s3/assets';
import { getSession } from '@/lib/auth/session';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const WEBSITE_GENERATION_FIELDS = {
  servicesOffered: z.string().max(2000).optional(),
  serviceAreas: z.string().max(2000).optional(),
  description: z.string().max(2000).optional(),
  differentiators: z.string().max(2000).optional(),
  brandTone: z.enum(BRAND_TONES).optional(),
  notes: z.string().max(2000).optional(),
  /** Manual Brand Theme System override — undefined means "Auto" (see ThemeField in BusinessForm.tsx). */
  theme: z.enum(THEME_NAMES).optional(),
};

/**
 * Photo-slot assignment overrides (see PhotoSlotField in BusinessForm.tsx).
 * Each value is either a URL taken from the business's own `photoUrls`, the
 * reserved literal `'none'`, or empty ("Auto" — undefined, keep the
 * automatic upload-order assignment).
 */
const PHOTO_SLOT_FIELDS = {
  heroPhotoUrl: z.string().optional(),
  aboutPhotoUrl: z.string().optional(),
  whyChooseUsPhotoUrl: z.string().optional(),
  servicesPhotoUrl: z.string().optional(),
};

const CreateBusinessFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  industry: z.enum(INDUSTRIES),
  source: z.enum(BUSINESS_SOURCES).default('manual'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  websiteUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  googlePlaceId: z.string().optional(),
  // Address fields
  addressLine1: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressPostalCode: z.string().optional(),
  ...WEBSITE_GENERATION_FIELDS,
  ...PHOTO_SLOT_FIELDS,
});

const EditBusinessFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  industry: z.enum(INDUSTRIES),
  status: z.enum(BUSINESS_STATUSES),
  source: z.enum(BUSINESS_SOURCES),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  websiteUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  googlePlaceId: z.string().optional(),
  addressLine1: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressPostalCode: z.string().optional(),
  ...WEBSITE_GENERATION_FIELDS,
  ...PHOTO_SLOT_FIELDS,
});

export type BusinessFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function coerceOptional(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

function websiteGenerationFields(formData: FormData) {
  return {
    servicesOffered: coerceOptional(formData.get('servicesOffered') as string | undefined),
    serviceAreas: coerceOptional(formData.get('serviceAreas') as string | undefined),
    description: coerceOptional(formData.get('description') as string | undefined),
    differentiators: coerceOptional(formData.get('differentiators') as string | undefined),
    brandTone: (formData.get('brandTone') as string) || undefined,
    notes: coerceOptional(formData.get('notes') as string | undefined),
    theme: (formData.get('theme') as string) || undefined,
    heroPhotoUrl: (formData.get('heroPhotoUrl') as string) || undefined,
    aboutPhotoUrl: (formData.get('aboutPhotoUrl') as string) || undefined,
    whyChooseUsPhotoUrl: (formData.get('whyChooseUsPhotoUrl') as string) || undefined,
    servicesPhotoUrl: (formData.get('servicesPhotoUrl') as string) || undefined,
  };
}

function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split('/').pop() || 'bin';
}

async function uploadBusinessAsset(businessId: string, file: File, filename: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `businesses/${businessId}/assets/${filename}`;
  await putAsset(key, buffer, file.type || 'application/octet-stream');
  return `/api/assets/${key}`;
}

/**
 * Uploads any logo/photo files present in the form to S3 and returns the
 * resulting public proxy URLs. Returns an empty object for a field when no
 * new file was chosen, so callers can spread the result over existing
 * values without clobbering them.
 */
async function uploadBusinessAssets(
  businessId: string,
  formData: FormData,
): Promise<{ logoUrl?: string; photoUrls?: string[] }> {
  const result: { logoUrl?: string; photoUrls?: string[] } = {};

  const logo = formData.get('logo');
  if (logo instanceof File && logo.size > 0) {
    result.logoUrl = await uploadBusinessAsset(businessId, logo, `logo.${fileExtension(logo)}`);
  }

  const photos = formData
    .getAll('photos')
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length > 0) {
    result.photoUrls = await Promise.all(
      photos.map((file, i) => uploadBusinessAsset(businessId, file, `photos/${i}.${fileExtension(file)}`)),
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Create business action
// ---------------------------------------------------------------------------

export async function createBusinessAction(
  _prevState: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const session = await getSession();
  if (!session) {
    return { message: 'Unauthorized' };
  }

  const raw = {
    name: formData.get('name') as string,
    industry: formData.get('industry') as string,
    source: (formData.get('source') as string) || 'manual',
    phone: coerceOptional(formData.get('phone') as string | undefined),
    email: coerceOptional(formData.get('email') as string | undefined),
    // Normalise URL before validation so users can omit the scheme.
    websiteUrl: normalizeUrl(coerceOptional(formData.get('websiteUrl') as string | undefined)),
    googlePlaceId: coerceOptional(formData.get('googlePlaceId') as string | undefined),
    addressLine1: coerceOptional(formData.get('addressLine1') as string | undefined),
    addressCity: coerceOptional(formData.get('addressCity') as string | undefined),
    addressState: coerceOptional(formData.get('addressState') as string | undefined),
    addressPostalCode: coerceOptional(formData.get('addressPostalCode') as string | undefined),
    ...websiteGenerationFields(formData),
  };

  const parsed = CreateBusinessFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
    const businessInput: CreateBusinessInput = {
      name: data.name,
      industry: data.industry,
      source: data.source,
      phone: data.phone,
      email: data.email,
      websiteUrl: data.websiteUrl || undefined,
    };

    const business = createBusiness(businessInput);

    // Resolve a unique slug
    const uniqueSlug = await resolveUniqueSlug(business.slug);
    const finalBusiness = { ...business, slug: uniqueSlug };

    // Add address if all required fields are present
    if (data.addressLine1 && data.addressCity && data.addressState && data.addressPostalCode) {
      (finalBusiness as typeof finalBusiness & { address?: object }).address = {
        line1: data.addressLine1,
        city: data.addressCity,
        state: data.addressState,
        postalCode: data.addressPostalCode,
        country: 'US',
      };
    }

    if (data.googlePlaceId) {
      (finalBusiness as typeof finalBusiness & { googlePlaceId?: string }).googlePlaceId =
        data.googlePlaceId;
    }

    const assets = await uploadBusinessAssets(finalBusiness.businessId, formData);

    await putBusiness({
      ...finalBusiness,
      servicesOffered: data.servicesOffered,
      serviceAreas: data.serviceAreas,
      description: data.description,
      differentiators: data.differentiators,
      brandTone: data.brandTone,
      notes: data.notes,
      theme: data.theme,
      heroPhotoUrl: data.heroPhotoUrl,
      aboutPhotoUrl: data.aboutPhotoUrl,
      whyChooseUsPhotoUrl: data.whyChooseUsPhotoUrl,
      servicesPhotoUrl: data.servicesPhotoUrl,
      ...assets,
    });
  } catch (err) {
    console.error('Failed to create business:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save business. Please try again.' };
  }

  redirect('/admin/businesses');
}

// ---------------------------------------------------------------------------
// Edit business action
// ---------------------------------------------------------------------------

export async function editBusinessAction(
  businessId: string,
  _prevState: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const session = await getSession();
  if (!session) {
    return { message: 'Unauthorized' };
  }

  const raw = {
    name: formData.get('name') as string,
    industry: formData.get('industry') as string,
    status: formData.get('status') as string,
    source: formData.get('source') as string,
    phone: coerceOptional(formData.get('phone') as string | undefined),
    email: coerceOptional(formData.get('email') as string | undefined),
    // Normalise URL before validation so users can omit the scheme.
    websiteUrl: normalizeUrl(coerceOptional(formData.get('websiteUrl') as string | undefined)),
    googlePlaceId: coerceOptional(formData.get('googlePlaceId') as string | undefined),
    addressLine1: coerceOptional(formData.get('addressLine1') as string | undefined),
    addressCity: coerceOptional(formData.get('addressCity') as string | undefined),
    addressState: coerceOptional(formData.get('addressState') as string | undefined),
    addressPostalCode: coerceOptional(formData.get('addressPostalCode') as string | undefined),
    ...websiteGenerationFields(formData),
  };

  const parsed = EditBusinessFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
    const existing = await getBusinessById(businessId);
    if (!existing) {
      return { message: 'Business not found' };
    }

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

    // Only replaces logoUrl/photoUrls when a new file was chosen; existing
    // values are preserved via the `...existing` spread otherwise.
    const assets = await uploadBusinessAssets(businessId, formData);

    await putBusiness({
      ...existing,
      name: data.name,
      industry: data.industry,
      status: data.status,
      source: data.source,
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
      theme: data.theme,
      heroPhotoUrl: data.heroPhotoUrl,
      aboutPhotoUrl: data.aboutPhotoUrl,
      whyChooseUsPhotoUrl: data.whyChooseUsPhotoUrl,
      servicesPhotoUrl: data.servicesPhotoUrl,
      ...assets,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to update business:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save changes. Please try again.' };
  }

  redirect(`/admin/businesses/${businessId}`);
}
