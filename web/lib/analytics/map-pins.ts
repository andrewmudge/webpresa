import type { Business } from '@/domain/models/business';
import type { Postcard } from '@/domain/models/postcard';
import { resolveZipCentroid } from '@/lib/geo/zip-centroid';
import type { PostcardMapPin, PostcardPinColor } from './dashboard-types';

/**
 * Postcard map card — pure, no I/O beyond the synchronous ZIP-centroid
 * lookup, mirroring `calculations.ts`'s "arrays in, typed array out" style.
 *
 * Scope: only businesses with at least one `Postcard` record appear at all
 * — this map answers "where are the businesses we've mailed," not "where
 * are all businesses." Color is most-advanced-funnel-stage-wins:
 * cancelled > customer > engaged/claimed > a postcard that's reached
 * mailed/delivered. A business whose only postcard(s) haven't yet reached
 * `mailed` (still pending/submitting/submitted/failed) and who hasn't
 * advanced past `outreach` has nothing sent far enough to plot yet, so it's
 * excluded rather than given an undefined 5th color.
 */
function pinColorFor(status: Business['status'], hasMailedOrDeliveredPostcard: boolean): PostcardPinColor | undefined {
  if (status === 'cancelled') return 'red';
  if (status === 'customer') return 'green';
  if (status === 'engaged' || status === 'claimed') return 'purple';
  if (hasMailedOrDeliveredPostcard) return 'blue';
  return undefined;
}

export function computeMapPins(businesses: Business[], postcards: Postcard[]): PostcardMapPin[] {
  const mailedOrDeliveredByBusinessId = new Set<string>();
  const hasAnyPostcardByBusinessId = new Set<string>();
  for (const postcard of postcards) {
    hasAnyPostcardByBusinessId.add(postcard.businessId);
    if (postcard.status === 'mailed' || postcard.status === 'delivered') {
      mailedOrDeliveredByBusinessId.add(postcard.businessId);
    }
  }

  const pins: PostcardMapPin[] = [];
  for (const business of businesses) {
    if (!hasAnyPostcardByBusinessId.has(business.businessId)) continue;

    const color = pinColorFor(business.status, mailedOrDeliveredByBusinessId.has(business.businessId));
    if (!color) continue;

    const centroid = resolveZipCentroid(business.address?.postalCode);
    if (!centroid) continue;

    pins.push({
      businessId: business.businessId,
      name: business.name,
      industry: business.industry,
      latitude: centroid.latitude,
      longitude: centroid.longitude,
      color,
      businessStatus: business.status,
    });
  }

  return pins;
}
