import 'server-only';
import type { Industry } from '@/domain/constants/industries';
import type { GooglePlaceSearchResult } from '@/domain/models/google-places';
import { searchPlacesText } from './client';
import { mapApiResultToSearchResult } from './map-result';
import { findDuplicateSignalsForBatch } from './duplicates';
import { GOOGLE_SEARCH_QUERY_LABELS } from './industry-map';

export interface SearchGooglePlacesInput {
  industry: Industry;
  /** Free-text location, e.g. "Austin, TX". */
  location: string;
}

/**
 * Runs a manual, admin-initiated Google Places search: builds a text query
 * from the chosen industry and location, calls the Places API, maps each
 * result onto the transient review shape, and annotates each with
 * review-time duplicate signals (re-checked server-side again immediately
 * before import — see `web/lib/google-places/duplicates.ts`).
 *
 * Never called automatically — only from the admin "Discover" Server Action.
 */
export async function searchGooglePlaces(
  input: SearchGooglePlacesInput,
): Promise<GooglePlaceSearchResult[]> {
  const label = GOOGLE_SEARCH_QUERY_LABELS[input.industry];
  const textQuery = `${label} in ${input.location}`;

  const apiResults = await searchPlacesText(textQuery);
  const mappedResults = apiResults.map(mapApiResultToSearchResult);

  const duplicateSignalsByPlaceId = await findDuplicateSignalsForBatch(
    mappedResults.map((mapped) => ({
      placeId: mapped.placeId,
      name: mapped.name,
      websiteUrl: mapped.websiteUrl,
      phone: mapped.phone,
      address: mapped.address,
    })),
  );

  const results: GooglePlaceSearchResult[] = mappedResults.map((mapped) => ({
    ...mapped,
    duplicateSignals: duplicateSignalsByPlaceId.get(mapped.placeId) ?? [],
  }));

  return results;
}
