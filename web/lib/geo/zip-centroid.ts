import zipcodes from 'zipcodes';

/**
 * Approximate lat/lng for a US postal code, via the bundled `zipcodes`
 * dataset (no network call, no geocoding API). This is a ZIP-centroid
 * approximation, not a street-level geocode — plenty precise for a
 * national pin map, not for anything needing address-level accuracy.
 * Returns `undefined` for a missing/unrecognized postal code rather than
 * throwing, so callers can simply skip that record.
 */
export function resolveZipCentroid(postalCode: string | undefined): { latitude: number; longitude: number } | undefined {
  if (!postalCode) return undefined;
  const match = zipcodes.lookup(postalCode.trim());
  if (!match || typeof match.latitude !== 'number' || typeof match.longitude !== 'number') return undefined;
  return { latitude: match.latitude, longitude: match.longitude };
}
