import { INDUSTRIES, type Industry } from '@/domain/constants/industries';

/**
 * Deterministic mapping from Google Places `primaryType` (and, as a
 * fallback, `types`) onto the existing, fixed `INDUSTRIES` enum.
 *
 * Google's type taxonomy does not line up 1:1 with `INDUSTRIES` — this is a
 * best-effort table, not a guarantee. `Business.industry` is required, so
 * the admin review UI must let the admin confirm or override the mapped
 * value (or pick one when nothing matches) before import — see
 * `app/admin/(dashboard)/discover/`.
 */
const GOOGLE_TYPE_TO_INDUSTRY: Record<string, Industry> = {
  plumber: 'plumbing',
  hvac_contractor: 'hvac',
  electrician: 'electrical',
  roofing_contractor: 'roofing',
  landscaping: 'landscaping',
  landscaper: 'landscaping',
  painter: 'painting',
  house_painter: 'painting',
  cleaning_service: 'cleaning',
  laundry_service: 'cleaning',
  restaurant: 'restaurant',
  meal_takeaway: 'restaurant',
  meal_delivery: 'restaurant',
  bakery: 'bakery',
  hair_salon: 'salon',
  hair_care: 'salon',
  beauty_salon: 'salon',
  barber_shop: 'salon',
  law_firm: 'law_firm',
  lawyer: 'law_firm',
  legal_services: 'law_firm',
  accounting: 'accounting',
  accountant: 'accounting',
  tax_preparation_service: 'accounting',
  finance: 'accounting',
};

/**
 * Search-query phrasing per industry, used to build the Google Places
 * Text Search `textQuery` (e.g. "plumbers in Austin, TX").
 */
export const GOOGLE_SEARCH_QUERY_LABELS: Record<Industry, string> = {
  plumbing: 'plumbers',
  hvac: 'HVAC contractors',
  electrical: 'electricians',
  roofing: 'roofing contractors',
  landscaping: 'landscaping companies',
  painting: 'painting contractors',
  cleaning: 'cleaning services',
  restaurant: 'restaurants',
  bakery: 'bakeries',
  salon: 'hair salons',
  law_firm: 'law firms',
  accounting: 'accounting firms',
};

/**
 * Maps a Google Places result's `primaryType`, falling back to scanning
 * `types`, onto the closest `INDUSTRIES` value. Returns undefined when
 * nothing matches — the admin must pick an industry manually in that case.
 */
export function mapGoogleTypeToIndustry(
  primaryType: string | undefined,
  types: string[] | undefined,
): Industry | undefined {
  if (primaryType && GOOGLE_TYPE_TO_INDUSTRY[primaryType]) {
    return GOOGLE_TYPE_TO_INDUSTRY[primaryType];
  }
  for (const type of types ?? []) {
    if (GOOGLE_TYPE_TO_INDUSTRY[type]) {
      return GOOGLE_TYPE_TO_INDUSTRY[type];
    }
  }
  return undefined;
}

/** Type guard used when parsing an admin-submitted industry override. */
export function isIndustry(value: string): value is Industry {
  return (INDUSTRIES as readonly string[]).includes(value);
}
