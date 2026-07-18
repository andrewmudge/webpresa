import { z } from 'zod';
import { INDUSTRIES } from '@/domain/constants/industries';
import { AddressSchema } from './common.schema';
import { DUPLICATE_SIGNAL_TYPES, DUPLICATE_SIGNAL_CONFIDENCE } from '@/domain/models/google-places';

// ---------------------------------------------------------------------------
// Raw Google Places API (New) response validation
//
// Loose on purpose — only validates the shape of the economical field mask
// Stage 12 actually requests (see implementation.md, "Economical field-mask
// requirements"). Every field is optional except `id`, since Google may omit
// a field entirely when a place has no data for it.
// ---------------------------------------------------------------------------

const LocalizedTextSchema = z.object({
  text: z.string(),
  languageCode: z.string().optional(),
});

const AddressComponentSchema = z.object({
  longText: z.string().optional(),
  shortText: z.string().optional(),
  types: z.array(z.string()).optional(),
  languageCode: z.string().optional(),
});

const LatLngSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

const OpeningHoursSchema = z.object({
  openNow: z.boolean().optional(),
  weekdayDescriptions: z.array(z.string()).optional(),
});

export const GooglePlaceApiResultSchema = z.object({
  id: z.string(),
  displayName: LocalizedTextSchema.optional(),
  formattedAddress: z.string().optional(),
  addressComponents: z.array(AddressComponentSchema).optional(),
  location: LatLngSchema.optional(),
  nationalPhoneNumber: z.string().optional(),
  internationalPhoneNumber: z.string().optional(),
  websiteUri: z.string().optional(),
  googleMapsUri: z.string().optional(),
  primaryType: z.string().optional(),
  primaryTypeDisplayName: LocalizedTextSchema.optional(),
  types: z.array(z.string()).optional(),
  businessStatus: z.string().optional(),
  rating: z.number().optional(),
  userRatingCount: z.number().optional(),
  regularOpeningHours: OpeningHoursSchema.optional(),
});
export type GooglePlaceApiResult = z.infer<typeof GooglePlaceApiResultSchema>;

export const GooglePlacesTextSearchResponseSchema = z.object({
  places: z.array(GooglePlaceApiResultSchema).optional(),
});

// ---------------------------------------------------------------------------
// Transient search-result round-trip validation
//
// The review UI carries each result back to the import Server Action as a
// hidden JSON field (see `app/admin/(dashboard)/discover/actions.ts`) — this
// is client-controlled input (an admin could tamper with a hidden field), so
// it must be validated like any other external input before use. The
// constructed Business record is re-validated by BusinessSchema and
// re-duplicate-checked regardless, so tampering here is bounded by what an
// authenticated admin could already do via the ordinary "New Business" form.
// ---------------------------------------------------------------------------

const DuplicateSignalSchema = z.object({
  type: z.enum(DUPLICATE_SIGNAL_TYPES),
  confidence: z.enum(DUPLICATE_SIGNAL_CONFIDENCE),
  matchedBusinessId: z.string(),
  matchedBusinessName: z.string(),
});

export const GooglePlaceSearchResultSchema = z.object({
  placeId: z.string().min(1),
  name: z.string().min(1).max(200),
  formattedAddress: z.string().optional(),
  address: AddressSchema.optional(),
  phone: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  googleMapsUrl: z.string().url().optional(),
  primaryType: z.string().optional(),
  types: z.array(z.string()).optional(),
  mappedIndustry: z.enum(INDUSTRIES).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  businessStatus: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  userRatingCount: z.number().int().min(0).optional(),
  openingHoursSummary: z.string().optional(),
  duplicateSignals: z.array(DuplicateSignalSchema),
});
