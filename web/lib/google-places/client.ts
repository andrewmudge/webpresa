import 'server-only';
import { getGooglePlacesSecret } from '@/lib/secrets';
import {
  GooglePlacesTextSearchResponseSchema,
  type GooglePlaceApiResult,
} from '@/domain/schemas/google-places.schema';

/**
 * Server-only Google Places API (New) client.
 *
 * The API key is fetched once from Secrets Manager (via
 * `getGooglePlacesSecret`, which caches indefinitely per process) and never
 * read from an environment variable or sent to the browser. Never log the
 * key or the raw request/response.
 */

const PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

/**
 * Economical field mask — only what discovery, review, duplicate detection,
 * and downstream eligibility need. See implementation.md, Stage 12,
 * "Economical field-mask requirements". Deliberately excludes any photo
 * field — Stage 12 never requests, downloads, or stores Google photos.
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
 * Runs a Google Places (New) Text Search request.
 * Never called from the browser — see `web/lib/google-places/search.ts`
 * for the caller, invoked only from admin Server Actions.
 */
export async function searchPlacesText(textQuery: string): Promise<GooglePlaceApiResult[]> {
  const { apiKey } = await getGooglePlacesSecret();

  let response: Response;
  try {
    response = await fetch(PLACES_TEXT_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({ textQuery }),
    });
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
  const parsed = GooglePlacesTextSearchResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new GooglePlacesApiError('unknown', 'Google Places API returned an unexpected response shape.');
  }

  return parsed.data.places ?? [];
}
