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

/**
 * Prefers the real Google Places coordinate (`Business.googlePlaceLatitude`/
 * `googlePlaceLongitude` — persisted at import/backfill time, see
 * `lib/google-places/import-candidate.ts` and
 * `scripts/backfill-business-location.ts`) over the ZIP-centroid
 * approximation. Only `source: 'google_places'` businesses ever have the
 * former; everyone else falls back to the ZIP centroid exactly as before.
 */
function resolveBusinessCoordinate(business: Business): { latitude: number; longitude: number } | undefined {
  if (business.googlePlaceLatitude !== undefined && business.googlePlaceLongitude !== undefined) {
    return { latitude: business.googlePlaceLatitude, longitude: business.googlePlaceLongitude };
  }
  return resolveZipCentroid(business.address?.postalCode);
}

const JITTER_RADIUS_METERS = 200;
const METERS_PER_DEGREE_LATITUDE = 111_320;

/**
 * Small lat/lng offset at the given angle, `JITTER_RADIUS_METERS` from
 * `centerLat`/`centerLng` — accounts for longitude's degree-length shrinking
 * away from the equator, so the offset stays a consistent real-world
 * distance regardless of latitude.
 */
function jitterOffset(centerLat: number, angleRadians: number): { dLat: number; dLng: number } {
  const dLat = (JITTER_RADIUS_METERS / METERS_PER_DEGREE_LATITUDE) * Math.cos(angleRadians);
  const metersPerDegreeLongitude = METERS_PER_DEGREE_LATITUDE * Math.cos((centerLat * Math.PI) / 180);
  const dLng = metersPerDegreeLongitude === 0 ? 0 : (JITTER_RADIUS_METERS / metersPerDegreeLongitude) * Math.sin(angleRadians);
  return { dLat, dLng };
}

/**
 * Groups pins that resolved to the same coordinate (rounded to 5 decimal
 * places, ~1.1m — fine enough that two independently-resolved real
 * addresses essentially never collide by coincidence) — whether both fell
 * back to the same ZIP centroid, or two businesses genuinely share a real
 * Google-reported coordinate (e.g. the same building) — and spreads each
 * group evenly around a small circle so no two pins sit on the identical
 * point. The spread angle is keyed off each pin's `businessId` (sorted),
 * never array/scan order, which isn't stable across requests — otherwise
 * pins would visually shuffle between page loads for no data reason. A
 * lone (non-colliding) pin is returned untouched.
 */
function spreadCollidingPins(pins: PostcardMapPin[]): PostcardMapPin[] {
  const groups = new Map<string, PostcardMapPin[]>();
  for (const pin of pins) {
    const key = `${pin.latitude.toFixed(5)},${pin.longitude.toFixed(5)}`;
    const group = groups.get(key);
    if (group) group.push(pin);
    else groups.set(key, [pin]);
  }

  const spread: PostcardMapPin[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      spread.push(group[0]);
      continue;
    }
    const sorted = [...group].sort((a, b) => a.businessId.localeCompare(b.businessId));
    sorted.forEach((pin, index) => {
      const angle = (2 * Math.PI * index) / sorted.length;
      const { dLat, dLng } = jitterOffset(pin.latitude, angle);
      spread.push({ ...pin, latitude: pin.latitude + dLat, longitude: pin.longitude + dLng });
    });
  }
  return spread;
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

    const coordinate = resolveBusinessCoordinate(business);
    if (!coordinate) continue;

    pins.push({
      businessId: business.businessId,
      name: business.name,
      industry: business.industry,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      color,
      businessStatus: business.status,
    });
  }

  return spreadCollidingPins(pins);
}
