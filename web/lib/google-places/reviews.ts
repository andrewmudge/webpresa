import 'server-only';
import type { BusinessTestimonial } from '@/domain/models/business';
import type { GooglePlaceReview } from '@/domain/schemas/google-places.schema';
import { getPlaceReviews } from './client';

// Mirrors BusinessSchema's testimonials.* bounds (domain/schemas/business.schema.ts)
// — capped defensively here too, since this is untrusted external content
// and a future schema/mapping drift should truncate, not throw deep inside
// `updateBusiness()`'s `BusinessSchema.parse()`.
const MAX_AUTHOR_LENGTH = 100;
const MAX_QUOTE_LENGTH = 4000;
const MAX_PUBLISH_TIME_DESCRIPTION_LENGTH = 50;

/**
 * Maps one raw Google review into a `BusinessTestimonial`. Returns `null`
 * for a review with no usable text (Google sometimes returns a rating-only
 * review) — `BusinessTestimonial.quote` is required, so there's nothing
 * meaningful to store for one.
 */
export function mapGoogleReviewToTestimonial(review: GooglePlaceReview): BusinessTestimonial | null {
  const quote = review.text?.text ?? review.originalText?.text;
  if (!quote) return null;

  // Google's review resource name IS already a stable per-review id — reused
  // directly as `id` rather than minting a second, separate identifier.
  // Falls back to a random id only for the (unexpected) case where Google
  // omits `name`, since then there's nothing stable to key a future refresh's
  // hidden-state/order-preservation matching off of anyway.
  const googleReviewId = review.name;
  const id = googleReviewId ?? crypto.randomUUID();

  return {
    id,
    author: (review.authorAttribution?.displayName ?? 'Google user').slice(0, MAX_AUTHOR_LENGTH),
    quote: quote.slice(0, MAX_QUOTE_LENGTH),
    source: 'google',
    hidden: false,
    rating: review.rating,
    authorPhotoUrl: review.authorAttribution?.photoUri,
    authorProfileUrl: review.authorAttribution?.uri,
    googleReviewId,
    publishTimeDescription: review.relativePublishTimeDescription?.slice(0, MAX_PUBLISH_TIME_DESCRIPTION_LENGTH),
  };
}

/**
 * Fetches and maps a place's individual reviews (capped at 5 by Google,
 * non-configurable, no pagination). Lets errors throw — callers decide
 * whether a fetch failure is fatal (an explicit admin "Import/Refresh"
 * action) or non-fatal (the automatic fetch during Google Places import,
 * which must never fail the business import itself).
 */
export async function fetchAndMapGoogleReviews(placeId: string): Promise<BusinessTestimonial[]> {
  const reviews = await getPlaceReviews(placeId);
  return reviews
    .map(mapGoogleReviewToTestimonial)
    .filter((t): t is BusinessTestimonial => t !== null);
}
