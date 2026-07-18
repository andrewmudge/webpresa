import type { Industry } from '@/domain/constants/industries';
import type { Address } from './common';

// ---------------------------------------------------------------------------
// Google Places Discovery (Stage 12)
//
// Everything in this file is transient — it exists only in server memory
// and the admin review UI's state until an admin explicitly selects and
// imports a result. Nothing here is persisted as-is; see
// `web/lib/google-places/` for the mapping onto the existing `Business`
// model and `web/docs/implementation.md`, Stage 12, for the full field
// mapping table and the fields deliberately kept transient-only.
// ---------------------------------------------------------------------------

export const DUPLICATE_SIGNAL_TYPES = [
  'place_id',
  'domain',
  'phone',
  'name_address',
  'name_city',
] as const;
export type DuplicateSignalType = (typeof DUPLICATE_SIGNAL_TYPES)[number];

export const DUPLICATE_SIGNAL_CONFIDENCE = ['blocking', 'warning'] as const;
export type DuplicateSignalConfidence = (typeof DUPLICATE_SIGNAL_CONFIDENCE)[number];

/**
 * A single duplicate indicator found against an existing `Business` record.
 * `blocking` signals (Place ID, domain, phone, name+address) require an
 * explicit admin override to import anyway. `warning` signals (name+city)
 * never block — they are surfaced for admin judgment only.
 */
export interface DuplicateSignal {
  type: DuplicateSignalType;
  confidence: DuplicateSignalConfidence;
  matchedBusinessId: string;
  matchedBusinessName: string;
}

/**
 * A single Google Places search result, shown to the admin for review.
 * Transient — never persisted as-is. See the field mapping table in
 * `implementation.md`, Stage 12, for which fields become `Business` fields
 * on import and which stay review-context-only.
 */
export interface GooglePlaceSearchResult {
  placeId: string;
  name: string;
  formattedAddress?: string;
  /** Structured address built from Google's addressComponents, when parseable into the existing Address shape. */
  address?: Address;
  phone?: string;
  websiteUrl?: string;
  googleMapsUrl?: string;
  /** Google's primary category, e.g. "plumber". */
  primaryType?: string;
  /** Additional categories — review context only, never persisted. */
  types?: string[];
  /** Best-match mapping onto the existing Industry enum. Undefined when no confident match exists — the admin must pick one before import. */
  mappedIndustry?: Industry;
  /** Review context only — never persisted onto Business (no map/territory feature consumes it yet). */
  latitude?: number;
  longitude?: number;
  /** Google's operational status (e.g. OPERATIONAL, CLOSED_PERMANENTLY). Review context only — distinct from Business.status. */
  businessStatus?: string;
  rating?: number;
  userRatingCount?: number;
  /** Lightweight, human-readable hours summary. Review context only — never persisted. */
  openingHoursSummary?: string;
  /** Duplicate signals computed against existing Business records at search-review time. Re-checked server-side again immediately before import. */
  duplicateSignals: DuplicateSignal[];
}
