import 'server-only';
import type { Business, BusinessTestimonial } from '@/domain/models/business';
import { getBusinessById, updateBusiness } from '@/lib/db/businesses';
import { parseIndexedList } from '@/lib/forms/indexed-list';
import { mergeTestimonialsPreservingOrder } from '@/lib/testimonials/merge';

/**
 * Customer-scoped counterpart to the admin's `updateBusinessListFieldAction`
 * / `toggleGoogleReviewVisibilityAction` / `reorderTestimonialsAction`.
 *
 * These three fields (`testimonials`/`faqItems`/`processSteps`) are read
 * directly from `Business` at render time — never from `SitePreview.content`
 * (see `app/b/[slug]/template/section-registry.tsx`) — so, unlike every
 * other section editor in this module, changes here take effect on the
 * live published site immediately, with no draft step. This is an existing
 * property of the render architecture, not something Stage 19 introduces;
 * it does not weaken the draft/publish guarantee for actual generated
 * content (hero/services copy, CTAs, theme, photos), which all do go
 * through `ensureDraftPreview`.
 */
export type CustomerBusinessListState = { message?: string } | undefined;

const BUSINESS_LIST_FIELDS = ['testimonials', 'faqItems', 'processSteps'] as const;
export type BusinessListField = (typeof BUSINESS_LIST_FIELDS)[number];

export async function updateCustomerBusinessListField(
  businessId: string,
  field: BusinessListField,
  formData: FormData,
): Promise<CustomerBusinessListState> {
  if (!(BUSINESS_LIST_FIELDS as readonly string[]).includes(field)) return { message: 'Unknown field' };

  try {
    let update: Partial<Business>;
    if (field === 'testimonials') {
      const business = await getBusinessById(businessId);
      if (!business) return { message: 'Business not found' };
      const rows = parseIndexedList(formData, 'testimonials', ['id', 'author', 'quote', 'rating']).filter(
        (r) => r.author && r.quote,
      );
      const manualTestimonials = rows.map((r) => {
        const ratingNum = Number(r.rating);
        const rating = r.rating && Number.isInteger(ratingNum) && ratingNum >= 1 && ratingNum <= 5 ? ratingNum : undefined;
        return {
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
    console.error(`Failed to update customer ${field}:`, err instanceof Error ? err.message : err);
    return { message: 'Failed to save changes. Please try again.' };
  }

  return undefined;
}

export type CustomerReviewsState = { message?: string; testimonials?: BusinessTestimonial[] } | undefined;

/** Google-sourced review author/rating/text stay immutable — only `hidden` toggles. */
export async function toggleCustomerReviewVisibility(
  businessId: string,
  googleReviewId: string,
): Promise<CustomerReviewsState> {
  const business = await getBusinessById(businessId);
  if (!business) return { message: 'Business not found' };

  const testimonials = (business.testimonials ?? []).map((t) =>
    t.source === 'google' && t.googleReviewId === googleReviewId ? { ...t, hidden: !t.hidden } : t,
  );

  try {
    await updateBusiness(businessId, { testimonials });
  } catch (err) {
    console.error('Failed to toggle review visibility:', err instanceof Error ? err.message : err);
    return { message: 'Failed to update review visibility. Please try again.' };
  }

  return { testimonials };
}

/** Reorders the full interleaved testimonials list; content/hidden-state untouched. */
export async function reorderCustomerTestimonials(businessId: string, order: string[]): Promise<CustomerReviewsState> {
  const business = await getBusinessById(businessId);
  if (!business) return { message: 'Business not found' };

  const existing = business.testimonials ?? [];
  const byId = new Map(existing.map((t) => [t.id, t]));
  const reordered = order.map((id) => byId.get(id)).filter((t): t is BusinessTestimonial => t !== undefined);
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
