'use server';
import { redirect } from 'next/navigation';
import type { WebsiteSectionType } from '@/domain/constants/website-sections';
import { requireCustomerSession, requireActiveSubscription, requireBusinessOwnership } from '@/lib/auth/customer-authorization';
import type { CustomerSessionPayload } from '@/lib/auth/customer-session';
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
  updateCustomerHeroPhotoSlots,
  updateCustomerAboutPhotoSlot,
  updateCustomerWhyChooseUsPhotoSlot,
  updateCustomerServicesPhotoSlot,
  updateCustomerLogo,
} from '@/lib/customer-editing/photos';
import { publishCustomerDraft } from '@/lib/customer-editing/publish';
import { updateCustomerDraftNoticePreference } from '@/lib/customer-editing/notification-preference';
import { updateCustomerBusinessHours } from '@/lib/customer-editing/hours';
import { updateCustomerAccountProfile } from '@/lib/customer-editing/account';
import { deleteCustomerWebsite } from '@/lib/customer-editing/delete-website';
import { requestCustomerPasswordReset } from '@/lib/auth/customer-cognito';
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
async function requireEditAccess(businessId: string): Promise<CustomerSessionPayload> {
  const session = await requireCustomerSession();
  await requireActiveSubscription(session.sub, businessId);
  return session;
}

/**
 * The website editor (`/app/businesses/[businessId]/website`) is a single
 * scrollable page, not six separate `?tab=` routes — every save redirects
 * back to the same page with a `#section` anchor so the browser scrolls
 * back to whichever section the customer was just editing, instead of
 * landing at the top. `anchor` is appended after the query string, since a
 * URL's fragment always comes last (`path?query#fragment`).
 */
function withError(path: string, message: string | undefined, anchor?: string): string {
  const query = message ? `error=${encodeURIComponent(message)}` : 'saved=1';
  const base = `${path}${path.includes('?') ? '&' : '?'}${query}`;
  return anchor ? `${base}#${anchor}` : base;
}

const SECTION_ANCHOR: Partial<Record<WebsiteSectionType, string>> = {
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
  if (!result?.message && !result?.errors) {
    // Hours lives on the preview's content, not Business — a separate,
    // narrower write (see `updateCustomerBusinessHours`'s doc comment for
    // why this isn't folded into `updateCustomerSectionContent`'s generic
    // 'contact' case). Only attempted once the Business-level fields above
    // saved cleanly.
    const hours = formData.get('hours');
    if (typeof hours === 'string') {
      await updateCustomerBusinessHours(businessId, hours);
    }
  }
  redirect(withError(`/app/businesses/${businessId}/settings`, result?.message ?? (result?.errors ? 'Please fix the highlighted fields.' : undefined)));
}

// ---------------------------------------------------------------------------
// Settings — Account card (Cognito profile, password reset) and Danger Zone
// ---------------------------------------------------------------------------

export async function updateAccountProfileAction(businessId: string, formData: FormData): Promise<void> {
  const session = await requireEditAccess(businessId);
  const result = await updateCustomerAccountProfile(session.sub, formData);
  redirect(withError(`/app/businesses/${businessId}/settings`, result?.message ?? (result?.errors ? 'Please fix the highlighted fields.' : undefined)));
}

/**
 * "Send password reset email" — this app's only supported password-change
 * flow, since the customer session carries no Cognito access token to
 * support an in-session "current password → new password" form (see
 * `implementation.md`'s Account card requirements: never fabricate a
 * password form that can't securely update credentials). Wraps the
 * existing `requestCustomerPasswordReset`, which never discloses whether
 * the account exists — this action mirrors that by never surfacing an
 * error either.
 */
export async function sendPasswordResetEmailAction(businessId: string): Promise<{ email: string }> {
  const session = await requireEditAccess(businessId);
  await requestCustomerPasswordReset(session.email);
  return { email: session.email };
}

/**
 * Called directly from a client component (`DeleteWebsiteModal`, via
 * `useTransition`), not a `<form action>` — returns an error state instead
 * of redirecting on failure, so the confirmation modal can show it inline
 * without ambiguity over whether a thrown `redirect()` was a success
 * navigation or an error one. Only redirects on genuine success.
 */
export async function deleteWebsiteActionCustomer(
  businessId: string,
  formData: FormData,
): Promise<{ message?: string } | undefined> {
  const session = await requireEditAccess(businessId);
  const business = await requireBusinessOwnership(session.sub, businessId);
  const typedName = formData.get('confirmName');
  if (typeof typedName !== 'string' || typedName !== business.name) {
    return { message: 'Business name did not match.' };
  }
  const result = await deleteCustomerWebsite(businessId, session.sub);
  if (result?.message) {
    return result;
  }
  redirect('/app?deleted=1');
}

// ---------------------------------------------------------------------------
// Website — CTA, section content, SEO, sections, business-list fields, photos
// ---------------------------------------------------------------------------

export async function updateCtaActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const result = await updateCustomerCta(businessId, formData);
  redirect(withError(`/app/businesses/${businessId}/website`, result?.message ?? (result?.errors ? 'Please fix the highlighted fields.' : undefined), 'contact'));
}

export async function updateSectionContentActionCustomer(
  businessId: string,
  section: WebsiteSectionType,
  formData: FormData,
): Promise<void> {
  await requireEditAccess(businessId);
  const result = await updateCustomerSectionContent(businessId, section, formData);
  redirect(withError(`/app/businesses/${businessId}/website`, result?.message, SECTION_ANCHOR[section] ?? 'content'));
}

// ---------------------------------------------------------------------------
// Merged Theme/Logo/photo-slot cards on the Website page — each of these
// combines a text-content write and a photo-slot write into one action, so
// a card that visually shows both (e.g. Hero's headline + hero photos) has
// exactly one Save button. If the content half fails validation, the photo
// half is never attempted (redirect happens immediately with that error);
// the two writes are otherwise independent (different DynamoDB items), not
// a single atomic transaction.
// ---------------------------------------------------------------------------

export async function updateThemeCardActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const result = await updateCustomerTheme(businessId, formData);
  redirect(withError(`/app/businesses/${businessId}/website`, result?.message, 'theme'));
}

export async function updateLogoActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const result = await updateCustomerLogo(businessId, formData);
  redirect(withError(`/app/businesses/${businessId}/website`, result?.message, 'logo'));
}

export async function updateHeroCardActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const contentResult = await updateCustomerSectionContent(businessId, 'hero', formData);
  if (contentResult?.message) redirect(withError(`/app/businesses/${businessId}/website`, contentResult.message, 'content'));
  const photoResult = await updateCustomerHeroPhotoSlots(businessId, formData);
  redirect(withError(`/app/businesses/${businessId}/website`, photoResult?.message, 'content'));
}

export async function updateAboutCardActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const contentResult = await updateCustomerSectionContent(businessId, 'about', formData);
  if (contentResult?.message) redirect(withError(`/app/businesses/${businessId}/website`, contentResult.message, 'content'));
  const photoResult = await updateCustomerAboutPhotoSlot(businessId, formData);
  redirect(withError(`/app/businesses/${businessId}/website`, photoResult?.message, 'content'));
}

export async function updateServicesCardActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const contentResult = await updateCustomerSectionContent(businessId, 'services', formData);
  if (contentResult?.message) redirect(withError(`/app/businesses/${businessId}/website`, contentResult.message, 'services'));
  const photoResult = await updateCustomerServicesPhotoSlot(businessId, formData);
  redirect(withError(`/app/businesses/${businessId}/website`, photoResult?.message, 'services'));
}

export async function updateWhyChooseUsCardActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const contentResult = await updateCustomerSectionContent(businessId, 'whyChooseUs', formData);
  if (contentResult?.message) redirect(withError(`/app/businesses/${businessId}/website`, contentResult.message, 'services'));
  const photoResult = await updateCustomerWhyChooseUsPhotoSlot(businessId, formData);
  redirect(withError(`/app/businesses/${businessId}/website`, photoResult?.message, 'services'));
}

export async function updateSeoActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const result = await updateCustomerSeo(businessId, formData);
  redirect(withError(`/app/businesses/${businessId}/website`, result?.message, 'seo'));
}

/**
 * Auto-save variant (no redirect) — mirrors the admin's
 * `autoSaveWebsiteSectionsAction`. Every checkbox toggle or up/down reorder
 * click on the customer Sections editor dispatches this immediately via
 * `useActionState`/`startTransition`, so the client's own optimistic
 * ordering state never has to survive a full page reload.
 */
export async function autoSaveSectionsActionCustomer(
  businessId: string,
  _prevState: { message?: string } | undefined,
  formData: FormData,
): Promise<{ message?: string } | undefined> {
  await requireEditAccess(businessId);
  return persistWebsiteSections(businessId, formData);
}

export async function updateBusinessListFieldActionCustomer(
  businessId: string,
  field: BusinessListField,
  formData: FormData,
): Promise<void> {
  await requireEditAccess(businessId);
  const result = await updateCustomerBusinessListField(businessId, field, formData);
  redirect(withError(`/app/businesses/${businessId}/website`, result?.message, 'services'));
}

export async function toggleReviewVisibilityActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const googleReviewId = formData.get('googleReviewId');
  if (typeof googleReviewId === 'string') {
    await toggleCustomerReviewVisibility(businessId, googleReviewId);
  }
  redirect(`/app/businesses/${businessId}/website?saved=1#sections`);
}

export async function reorderTestimonialsActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const order = formData.getAll('order').filter((v): v is string => typeof v === 'string');
  if (order.length > 0) {
    await reorderCustomerTestimonials(businessId, order);
  }
  redirect(`/app/businesses/${businessId}/website?saved=1#sections`);
}

export async function addPhotosActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const result = await addCustomerBusinessPhotos(businessId, formData);
  redirect(withError(`/app/businesses/${businessId}/website`, result?.message, 'photos'));
}

export async function deletePhotoActionCustomer(businessId: string, formData: FormData): Promise<void> {
  await requireEditAccess(businessId);
  const photoUrl = formData.get('photoUrl');
  if (typeof photoUrl === 'string') {
    await deleteCustomerBusinessPhoto(businessId, photoUrl);
  }
  redirect(`/app/businesses/${businessId}/website?saved=1#photos`);
}

// ---------------------------------------------------------------------------
// Notification preference — the "draft changes" toast's durable, cross-
// device opt-out (see `Business.draftChangesNoticeEnabled`). Deliberately
// NOT FormData-based and never redirects: called directly as a plain
// function from client components — the toast (mid-edit, must not disrupt
// the page) and a small Settings toggle — both via the same call shape.
// ---------------------------------------------------------------------------

export async function updateDraftNoticePreferenceActionCustomer(
  businessId: string,
  enabled: boolean,
): Promise<{ message?: string } | undefined> {
  await requireEditAccess(businessId);
  return updateCustomerDraftNoticePreference(businessId, enabled);
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
