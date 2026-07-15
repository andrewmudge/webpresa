'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { INDUSTRIES } from '@/domain/constants/industries';
import { BRAND_TONES } from '@/domain/constants/brand-tone';
import { THEME_NAMES } from '@/domain/constants/themes';
import { BUSINESS_SOURCES } from '@/domain/models/business';
import { createBusiness, type CreateBusinessInput } from '@/domain/factories/business.factory';
import { putBusiness, resolveUniqueSlug } from '@/lib/db/businesses';
import { getSession } from '@/lib/auth/session';

// ---------------------------------------------------------------------------
// Schemas
//
// Business creation is step 1 of the 3-step "Add business" wizard (details
// → photos → sections — see `[businessId]/onboarding/`). It intentionally
// only covers free-text fields; logo/photo uploads and photo-slot
// assignment require an existing `businessId` to upload against, so they
// live in `updatePhotosAction` (`[businessId]/actions.ts`), exercised on
// wizard step 2 and reused as the business detail page's "Photos" card.
// ---------------------------------------------------------------------------

const WEBSITE_GENERATION_FIELDS = {
  servicesOffered: z.string().max(2000).optional(),
  serviceAreas: z.string().max(2000).optional(),
  description: z.string().max(2000).optional(),
  differentiators: z.string().max(2000).optional(),
  brandTone: z.enum(BRAND_TONES).optional(),
  notes: z.string().max(2000).optional(),
  /** Manual Brand Theme System override — undefined means "Auto" (see ThemeField in FormFields.tsx). */
  theme: z.enum(THEME_NAMES).optional(),
};

const CreateBusinessFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  industry: z.enum(INDUSTRIES),
  legalName: z.string().max(200).optional(),
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
  };
}

// ---------------------------------------------------------------------------
// Create business action — wizard step 1
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
    legalName: coerceOptional(formData.get('legalName') as string | undefined),
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
  let businessId: string;

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
    businessId = finalBusiness.businessId;

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

    await putBusiness({
      ...finalBusiness,
      legalName: data.legalName,
      servicesOffered: data.servicesOffered,
      serviceAreas: data.serviceAreas,
      description: data.description,
      differentiators: data.differentiators,
      brandTone: data.brandTone,
      notes: data.notes,
      theme: data.theme,
    });
  } catch (err) {
    console.error('Failed to create business:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save business. Please try again.' };
  }

  // Step 2 of the wizard — photo upload.
  redirect(`/admin/businesses/${businessId}/onboarding/photos`);
}
