import 'server-only';
import type { Industry } from '@/domain/constants/industries';
import type { Business } from '@/domain/models/business';
import type { GooglePlaceSearchResult } from '@/domain/models/google-places';
import { createBusiness } from '@/domain/factories/business.factory';
import { putBusiness, updateBusiness, resolveUniqueSlug } from '@/lib/db/businesses';
import { fetchAndMapGoogleReviews } from '@/lib/google-places/reviews';
import { enableWebsiteSection } from '@/lib/website-sections/resolve';

/**
 * Creates one `Business` from a validated Google Places search result — the
 * shared per-candidate logic behind both the standalone Discover page
 * (`app/admin/(dashboard)/discover/actions.ts`) and the campaign-scoped
 * discover flow (`app/admin/(dashboard)/campaigns/[campaignId]/discover/actions.ts`),
 * so the two import paths can't silently drift apart. Never throws for the
 * best-effort Google reviews import — a failure there just means no
 * testimonials yet, exactly as before this was extracted.
 */
export async function importGooglePlaceCandidate(
  result: GooglePlaceSearchResult,
  industry: Industry,
): Promise<{ businessId: string } | { error: string }> {
  try {
    const created = createBusiness({
      name: result.name,
      industry,
      source: 'google_places',
      phone: result.phone,
      websiteUrl: result.websiteUrl,
    });
    const uniqueSlug = await resolveUniqueSlug(created.slug);

    const record: Business = {
      ...created,
      slug: uniqueSlug,
      googlePlaceId: result.placeId,
      ...(result.address ? { address: result.address } : {}),
      ...(result.googleMapsUrl ? { googleMapsUrl: result.googleMapsUrl } : {}),
      ...(result.rating !== undefined ? { googleRating: result.rating } : {}),
      ...(result.userRatingCount !== undefined ? { googleReviewCount: result.userRatingCount } : {}),
    };

    await putBusiness(record);

    // Automatic Google reviews import (Stage 12 follow-on) — best-effort,
    // never allowed to fail the business import itself.
    if (record.googlePlaceId) {
      try {
        const googleTestimonials = await fetchAndMapGoogleReviews(record.googlePlaceId);
        if (googleTestimonials.length > 0) {
          await updateBusiness(record.businessId, {
            testimonials: googleTestimonials,
            websiteSections: enableWebsiteSection(record, 'reviews'),
          });
        }
      } catch (reviewErr) {
        console.error('[google-places] reviews import failed', {
          placeId: record.googlePlaceId,
          message: reviewErr instanceof Error ? reviewErr.message : String(reviewErr),
        });
      }
    }

    return { businessId: record.businessId };
  } catch (err) {
    console.error('[google-places] import failed', {
      placeId: result.placeId,
      message: err instanceof Error ? err.message : String(err),
    });
    return { error: 'Could not save business' };
  }
}
