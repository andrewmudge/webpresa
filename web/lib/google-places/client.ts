import 'server-only';
import { getGooglePlacesSecret } from '@/lib/secrets';
import {
  GooglePlacesTextSearchResponseSchema,
  GooglePlaceDetailsReviewsResponseSchema,
  type GooglePlaceApiResult,
  type GooglePlaceReview,
} from '@/domain/schemas/google-places.schema';
import type { z } from 'zod';

/**
 * Server-only Google Places API (New) client.
 *
 * The API key is fetched once from Secrets Manager (via
 * `getGooglePlacesSecret`, which caches indefinitely per process) and never
 * read from an environment variable or sent to the browser. Never log the
 * key or the raw request/response.
 */

const PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const PLACES_DETAILS_URL = 'https://places.googleapis.com/v1/places';

/**
 * Economical field mask — only what discovery, review, duplicate detection,
 * and downstream eligibility need. See implementation.md, Stage 12,
 * "Economical field-mask requirements". Deliberately excludes any photo
 * field — Stage 12 never requests, downloads, or stores Google Place photos.
 */
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.addressComponents',
  'places.location',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.primaryType',
  'places.types',
  'places.businessStatus',
  'places.rating',
  'places.userRatingCount',
  'places.regularOpeningHours.weekdayDescriptions',
].join(',');

/**
 * Field mask for the individual-reviews Place Details call (Stage 12
 * follow-on). Sits in the same higher-cost SKU tier as `rating`/
 * `userRatingCount`/`regularOpeningHours` above — see deployment.md.
 * Still no photo field — a reviewer's own avatar (`authorAttribution.photoUri`)
 * is a separate, directly-hotlinkable Google CDN URL, not a Google Place
 * Photo, and isn't affected by the "no Place photos" rule.
 */
const REVIEWS_FIELD_MASK = [
  'reviews.name',
  'reviews.rating',
  'reviews.text',
  'reviews.originalText',
  'reviews.authorAttribution',
  'reviews.relativePublishTimeDescription',
  'reviews.publishTime',
].join(',');

export const GOOGLE_PLACES_ERROR_CATEGORIES = [
  'invalid_key',
  'permission_denied',
  'quota_exceeded',
  'invalid_request',
  'unknown',
] as const;
export type GooglePlacesErrorCategory = (typeof GOOGLE_PLACES_ERROR_CATEGORIES)[number];

export class GooglePlacesApiError extends Error {
  category: GooglePlacesErrorCategory;

  constructor(category: GooglePlacesErrorCategory, message: string) {
    super(message);
    this.name = 'GooglePlacesApiError';
    this.category = category;
  }
}

function categorizeError(status: number, apiStatus: string | undefined): GooglePlacesErrorCategory {
  if (status === 429 || apiStatus === 'RESOURCE_EXHAUSTED') return 'quota_exceeded';
  if (status === 401) return 'invalid_key';
  if (status === 403 || apiStatus === 'PERMISSION_DENIED') return 'permission_denied';
  if (status === 400 || apiStatus === 'INVALID_ARGUMENT') return 'invalid_request';
  return 'unknown';
}

/**
 * Shared request/response handling for every Places API (New) call: network
 * failure, non-2xx categorization, and response-shape validation. Extracted
 * so `getPlaceReviews()` doesn't duplicate `searchPlacesText()`'s error
 * handling.
 */
async function requestPlacesApi<Schema extends z.ZodTypeAny>(
  url: string,
  init: RequestInit,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new GooglePlacesApiError('unknown', 'Could not reach the Google Places API.');
  }

  if (!response.ok) {
    let apiStatus: string | undefined;
    let apiMessage: string | undefined;
    try {
      const body = (await response.json()) as { error?: { status?: string; message?: string } };
      apiStatus = body.error?.status;
      apiMessage = body.error?.message;
    } catch {
      // Non-JSON error body — fall through with generic messaging.
    }
    const category = categorizeError(response.status, apiStatus);
    throw new GooglePlacesApiError(
      category,
      apiMessage ?? `Google Places API request failed (HTTP ${response.status}).`,
    );
  }

  const json = await response.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new GooglePlacesApiError('unknown', 'Google Places API returned an unexpected response shape.');
  }

  return parsed.data;
}

/**
 * Runs a Google Places (New) Text Search request.
 * Never called from the browser — see `web/lib/google-places/search.ts`
 * for the caller, invoked only from admin Server Actions.
 */
export async function searchPlacesText(textQuery: string): Promise<GooglePlaceApiResult[]> {
  const { apiKey } = await getGooglePlacesSecret();

  const parsed = await requestPlacesApi(
    PLACES_TEXT_SEARCH_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({ textQuery }),
    },
    GooglePlacesTextSearchResponseSchema,
  );

  return parsed.places ?? [];
}

/**
 * Runs a Google Place Details (New) request for a single place's individual
 * reviews. Google caps this at 5 reviews per place — non-configurable, no
 * pagination. Never called from the browser — see
 * `web/lib/google-places/reviews.ts` for the mapping caller.
 */
export async function getPlaceReviews(placeId: string): Promise<GooglePlaceReview[]> {
  const { apiKey } = await getGooglePlacesSecret();

  const parsed = await requestPlacesApi(
    `${PLACES_DETAILS_URL}/${encodeURIComponent(placeId)}`,
    {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': REVIEWS_FIELD_MASK,
      },
    },
    GooglePlaceDetailsReviewsResponseSchema,
  );

  return parsed.reviews ?? [];
}
