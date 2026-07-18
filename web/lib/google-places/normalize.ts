import type { Address } from '@/domain/models/common';
import type { GooglePlaceApiResult } from '@/domain/schemas/google-places.schema';

/**
 * Pure normalization helpers shared by duplicate detection and the
 * Google Places → Business field mapping (Stage 12). No AWS, no network.
 */

/**
 * Digits-only phone comparison key. Strips a leading US/Canada country code
 * (a leading `1` on an 11-digit number) so "+1 512-555-0100" and
 * "(512) 555-0100" normalize to the same key. Returns undefined for
 * empty/missing input.
 */
export function normalizePhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  return digits.length > 0 ? digits : undefined;
}

/** Lowercased hostname with `www.` stripped, for duplicate-domain comparison. */
export function normalizeDomain(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const trimmed = url.trim();
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const host = new URL(withProtocol).hostname.toLowerCase();
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return undefined;
  }
}

/** Case/punctuation/whitespace-normalized comparison key for names and addresses. */
export function normalizeName(value: string | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Builds the existing `Address` shape from Google's `addressComponents`.
 * Returns undefined when the minimum required fields (line1, city, state,
 * postalCode, country — all required by AddressSchema) can't be assembled,
 * rather than persisting a partially-guessed address.
 */
export function buildAddressFromComponents(
  components: GooglePlaceApiResult['addressComponents'],
): Address | undefined {
  if (!components || components.length === 0) return undefined;

  const find = (type: string) => components.find((c) => c.types?.includes(type));

  const streetNumber = find('street_number')?.longText;
  const route = find('route')?.longText;
  const city =
    find('locality')?.longText ??
    find('postal_town')?.longText ??
    find('sublocality')?.longText;
  const state = find('administrative_area_level_1')?.shortText;
  const postalCode = find('postal_code')?.longText;
  const country = find('country')?.shortText;

  const line1 = [streetNumber, route].filter(Boolean).join(' ').trim();

  if (!line1 || !city || !state || !postalCode || !country) {
    return undefined;
  }

  return { line1, city, state, postalCode, country };
}

/** A short, human-readable hours summary for review context — never persisted. */
export function summarizeOpeningHours(
  hours: GooglePlaceApiResult['regularOpeningHours'],
): string | undefined {
  if (!hours?.weekdayDescriptions || hours.weekdayDescriptions.length === 0) return undefined;
  return hours.weekdayDescriptions.join('; ');
}
