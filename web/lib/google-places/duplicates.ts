import 'server-only';
import type { Business } from '@/domain/models/business';
import type { Address } from '@/domain/models/common';
import type { DuplicateSignal } from '@/domain/models/google-places';
import { getBusinessByGooglePlaceId, listAllBusinesses } from '@/lib/db/businesses';
import { normalizeDomain, normalizePhone, normalizeName } from './normalize';

/**
 * Duplicate-detection input — the minimum fields needed to run every
 * priority-ordered check. Reused for both the review-time search results
 * and the server-side re-check immediately before import (see
 * implementation.md, Stage 12, "Server-side duplicate detection").
 */
export interface DuplicateCandidate {
  placeId: string;
  name: string;
  websiteUrl?: string;
  phone?: string;
  address?: Address;
}

function fullAddressKey(address: Address | undefined): string | undefined {
  if (!address) return undefined;
  return normalizeName(`${address.line1} ${address.city} ${address.state} ${address.postalCode}`);
}

/**
 * Pure comparison against an already-loaded list of businesses — no I/O.
 * Checks, in priority order:
 *   2. normalized website domain
 *   3. normalized phone number
 *   4. normalized business name + full address
 *   5. normalized business name + city (lower-confidence warning only)
 *
 * Google Place ID (priority 1) is not checked here — it's a fast indexed
 * lookup handled separately by `findDuplicateSignals` / `findDuplicateSignalsForBatch`
 * below, since it doesn't require scanning the full business list.
 */
export function checkDuplicatesAgainstList(
  candidate: DuplicateCandidate,
  businesses: Business[],
): DuplicateSignal[] {
  const candidateDomain = normalizeDomain(candidate.websiteUrl);
  const candidatePhone = normalizePhone(candidate.phone);
  const candidateName = normalizeName(candidate.name);
  const candidateFullAddress = fullAddressKey(candidate.address);
  const candidateCity = candidate.address?.city ? normalizeName(candidate.address.city) : undefined;

  const signals: DuplicateSignal[] = [];

  for (const business of businesses) {
    const businessName = normalizeName(business.name);

    if (candidateDomain) {
      const businessDomain = normalizeDomain(business.websiteUrl);
      if (businessDomain && businessDomain === candidateDomain) {
        signals.push({
          type: 'domain',
          confidence: 'blocking',
          matchedBusinessId: business.businessId,
          matchedBusinessName: business.name,
        });
      }
    }

    if (candidatePhone) {
      const businessPhone = normalizePhone(business.phone);
      if (businessPhone && businessPhone === candidatePhone) {
        signals.push({
          type: 'phone',
          confidence: 'blocking',
          matchedBusinessId: business.businessId,
          matchedBusinessName: business.name,
        });
      }
    }

    if (candidateFullAddress && businessName === candidateName) {
      const businessFullAddress = fullAddressKey(business.address);
      if (businessFullAddress && businessFullAddress === candidateFullAddress) {
        signals.push({
          type: 'name_address',
          confidence: 'blocking',
          matchedBusinessId: business.businessId,
          matchedBusinessName: business.name,
        });
      }
    }

    if (candidateCity && businessName === candidateName) {
      const businessCity = business.address?.city ? normalizeName(business.address.city) : undefined;
      if (businessCity && businessCity === candidateCity) {
        signals.push({
          type: 'name_city',
          confidence: 'warning',
          matchedBusinessId: business.businessId,
          matchedBusinessName: business.name,
        });
      }
    }
  }

  return signals;
}

async function checkPlaceId(placeId: string): Promise<DuplicateSignal | undefined> {
  const match = await getBusinessByGooglePlaceId(placeId);
  if (!match) return undefined;
  return {
    type: 'place_id',
    confidence: 'blocking',
    matchedBusinessId: match.businessId,
    matchedBusinessName: match.name,
  };
}

/**
 * Full duplicate check for a single candidate — one indexed Place ID
 * lookup plus one full-table scan. A Place ID match is definitive and
 * short-circuits the rest.
 */
export async function findDuplicateSignals(candidate: DuplicateCandidate): Promise<DuplicateSignal[]> {
  const placeIdSignal = await checkPlaceId(candidate.placeId);
  if (placeIdSignal) return [placeIdSignal];

  const businesses = await listAllBusinesses();
  return checkDuplicatesAgainstList(candidate, businesses);
}

/**
 * Full duplicate check for a batch of candidates (one Google Places search,
 * or one import submission) — loads the business list once and reuses it
 * for every candidate, rather than re-scanning the table per result.
 */
export async function findDuplicateSignalsForBatch(
  candidates: DuplicateCandidate[],
): Promise<Map<string, DuplicateSignal[]>> {
  const businesses = await listAllBusinesses();
  const results = new Map<string, DuplicateSignal[]>();

  for (const candidate of candidates) {
    const placeIdSignal = await checkPlaceId(candidate.placeId);
    results.set(
      candidate.placeId,
      placeIdSignal ? [placeIdSignal] : checkDuplicatesAgainstList(candidate, businesses),
    );
  }

  return results;
}
