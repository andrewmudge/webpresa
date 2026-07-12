'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { INDUSTRIES } from '@/domain/constants/industries';
import { BUSINESS_SOURCES, BUSINESS_STATUSES } from '@/domain/models/business';
import { createBusiness, type CreateBusinessInput } from '@/domain/factories/business.factory';
import { putBusiness, resolveUniqueSlug, getBusinessById } from '@/lib/db/businesses';
import { getSession } from '@/lib/auth/session';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

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

    await putBusiness(finalBusiness);
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
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to update business:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save changes. Please try again.' };
  }

  redirect(`/admin/businesses/${businessId}`);
}
