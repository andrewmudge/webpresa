import type { GooglePlaceSearchResult } from '@/domain/models/google-places';
import type { GooglePlaceApiResult } from '@/domain/schemas/google-places.schema';
import { mapGoogleTypeToIndustry } from './industry-map';
import { buildAddressFromComponents, summarizeOpeningHours } from './normalize';

/**
 * Maps one raw Google Places API (New) result onto the transient
 * `GooglePlaceSearchResult` review shape. `duplicateSignals` is populated
 * separately (see `search.ts`) since it requires an async repository call.
 *
 * Deliberately does not read or map any photo field — see
 * implementation.md, Stage 12, "No Google Places photo downloading".
 */
export function mapApiResultToSearchResult(
  result: GooglePlaceApiResult,
): Omit<GooglePlaceSearchResult, 'duplicateSignals'> {
  return {
    placeId: result.id,
    name: result.displayName?.text ?? result.formattedAddress ?? 'Unknown business',
    formattedAddress: result.formattedAddress,
    address: buildAddressFromComponents(result.addressComponents),
    phone: result.internationalPhoneNumber ?? result.nationalPhoneNumber,
    websiteUrl: result.websiteUri,
    googleMapsUrl: result.googleMapsUri,
    primaryType: result.primaryType,
    types: result.types,
    mappedIndustry: mapGoogleTypeToIndustry(result.primaryType, result.types),
    latitude: result.location?.latitude,
    longitude: result.location?.longitude,
    businessStatus: result.businessStatus,
    rating: result.rating,
    userRatingCount: result.userRatingCount,
    openingHoursSummary: summarizeOpeningHours(result.regularOpeningHours),
  };
}
