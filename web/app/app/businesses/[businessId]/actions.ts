'use server';
import { redirect } from 'next/navigation';
import type { WebsiteSectionType } from '@/domain/constants/website-sections';
import { requireCustomerSession, requireActiveSubscription } from '@/lib/auth/customer-authorization';
import { updateCustomerBusinessInfo } from '@/lib/customer-editing/business-info';
import { updateCustomerTheme } from '@/lib/customer-editing/theme';
import { updateCustomerCta } from '@/lib/customer-editing/cta';
import { updateCustomerSectionContent } from '@/lib/customer-editing/section-content';
import { updateCustomerSeo } from '@/lib/customer-editing/seo';
import {
  updateCustomerBusinessListField,
  toggleCustomerReviewVisibility,
  reorderCustomerTestimonials,
  type BusinessListField,
} from '@/lib/customer-editing/business-list';
import {
  addCustomerBusinessPhotos,
  deleteCustomerBusinessPhoto,
  updateCustomerPhotoSlots,
} from '@/lib/customer-editing/photos';
import { publishCustomerDraft } from '@/lib/customer-editing/publish';
import { persistWebsiteSections } from '@/lib/website-sections/persist';

/**
 * Every customer-scoped mutation in this module goes through this same
 * three-step check — session, ownership, entitlement — independently of
 * whatever the page that submitted the form already rendered (see
 * implementation.md, Stage 19, "Authorization model": "every page and every
 * Server Action independently..."). `requireActiveSubscription` is exactly
 * the right primitive for a *mutation*: it redirects unless access mode is
 * `'full'`, which is also this stage's rule for every edit/publish action —
 * `billing_recovery` may *view* a draft (see the `/b/[slug]` change) but
 * never create, edit, or publish one.
 *
 * These actions never call the admin's Server Actions in
 * `app/admin/(dashboard)/businesses/[businessId]/actions.ts` (those check
 * an admin session, not this one) — they call the same underlying,
 * auth-agnostic `lib/` functions those admin actions call instead.
 */
async function requireEditAccess(businessId: string): Promise<string> {
  const session = await requireCustomerSession();
  await requireActiveSubscription(session.sub, businessId);
  return session.sub;
}

function withError(path: string, message: string | undefined): string {
  return message ? `${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(message)}` : `${path}${path.includes('?') ? '&' : '?'}saved=1`;
}

const SECTION_TAB: Partial<Record<WebsiteSectionType, string>> = {
  hero: 'content',
  about: 'content',
  services: 'services',
  whyChooseUs: 'services',
  serviceAreas: 'services',
  gallery: 'photos',
  contact: 'contact',
  ctaBanner: 'sections',
};

// ---------------------------------------------------------------------------
// Settings — canonical business/contact fields (single edit surface, see
// implementation.md Stage 19, "Contact & CTAs vs. Settings")
// ---------------------------------------------------------------------------

export async function updateBusinessInfoAction(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const result = await updateCustomerBusinessInfo(businessId, formData);
  redirect(withError(`/app/businesses/${businessId}/settings`, result?.message ?? (result?.errors ? 'Please fix the highlighted fields.' : undefined)));
}

// ---------------------------------------------------------------------------
// Design — theme, hero/section photo slots
// ---------------------------------------------------------------------------

export async function updateThemeActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const result = await updateCustomerTheme(businessId, formData);
  redirect(withError(`/app/businesses/${businessId}/design`, result?.message));
}

export async function updatePhotoSlotsAction(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const result = await updateCustomerPhotoSlots(businessId, formData);
  redirect(withError(`/app/businesses/${businessId}/design`, result?.message));
}

// ---------------------------------------------------------------------------
// Website — CTA, section content, SEO, sections, business-list fields, photos
// ---------------------------------------------------------------------------

export async function updateCtaActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const result = await updateCustomerCta(businessId, formData);
  redirect(withError(`/app/businesses/${businessId}/website?tab=contact`, result?.message ?? (result?.errors ? 'Please fix the highlighted fields.' : undefined)));
}

export async function updateSectionContentActionCustomer(
  businessId: string,
  section: WebsiteSectionType,
  formData: FormData,
): Promise<void> {
  await requireEditAccess(businessId);
  const result = await updateCustomerSectionContent(businessId, section, formData);
  redirect(withError(`/app/businesses/${businessId}/website?tab=${SECTION_TAB[section] ?? 'content'}`, result?.message));
}

export async function updateSeoActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const result = await updateCustomerSeo(businessId, formData);
  redirect(withError(`/app/businesses/${businessId}/website?tab=seo`, result?.message));
}

export async function updateSectionsActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const result = await persistWebsiteSections(businessId, formData);
  redirect(withError(`/app/businesses/${businessId}/website?tab=sections`, result?.message));
}

export async function updateBusinessListFieldActionCustomer(
  businessId: string,
  field: BusinessListField,
  formData: FormData,
): Promise<void> {
  await requireEditAccess(businessId);
  const result = await updateCustomerBusinessListField(businessId, field, formData);
  redirect(withError(`/app/businesses/${businessId}/website?tab=services`, result?.message));
}

export async function toggleReviewVisibilityActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const googleReviewId = formData.get('googleReviewId');
  if (typeof googleReviewId === 'string') {
    await toggleCustomerReviewVisibility(businessId, googleReviewId);
  }
  redirect(`/app/businesses/${businessId}/website?tab=sections&saved=1`);
}

export async function reorderTestimonialsActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const order = formData.getAll('order').filter((v): v is string => typeof v === 'string');
  if (order.length > 0) {
    await reorderCustomerTestimonials(businessId, order);
  }
  redirect(`/app/businesses/${businessId}/website?tab=sections&saved=1`);
}

export async function addPhotosActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const result = await addCustomerBusinessPhotos(businessId, formData);
  redirect(withError(`/app/businesses/${businessId}/website?tab=photos`, result?.message));
}

export async function deletePhotoActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const photoUrl = formData.get('photoUrl');
  if (typeof photoUrl === 'string') {
    await deleteCustomerBusinessPhoto(businessId, photoUrl);
  }
  redirect(`/app/businesses/${businessId}/website?tab=photos&saved=1`);
}

// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

export async function publishDraftActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const previewId = formData.get('previewId');
  if (typeof previewId !== 'string') redirect(`/app/businesses/${businessId}`);
  const result = await publishCustomerDraft(businessId, previewId);
  redirect(
    result?.message
      ? `/app/businesses/${businessId}?error=${encodeURIComponent(result.message)}`
      : `/app/businesses/${businessId}?published=1`,
  );
}
