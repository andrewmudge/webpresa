import { describe, it, expect } from 'vitest';
import { mapApiResultToSearchResult } from '../map-result';
import type { GooglePlaceApiResult } from '@/domain/schemas/google-places.schema';

describe('mapApiResultToSearchResult', () => {
  it('maps identity, contact, and review fields; never touches a photo field', () => {
    const apiResult: GooglePlaceApiResult = {
      id: 'place_123',
      displayName: { text: 'Acme Plumbing' },
      formattedAddress: '123 Main St, Austin, TX 78701, USA',
      addressComponents: [
        { longText: '123', types: ['street_number'] },
        { longText: 'Main St', types: ['route'] },
        { longText: 'Austin', types: ['locality'] },
        { shortText: 'TX', types: ['administrative_area_level_1'] },
        { longText: '78701', types: ['postal_code'] },
        { shortText: 'US', types: ['country'] },
      ],
      location: { latitude: 30.27, longitude: -97.74 },
      internationalPhoneNumber: '+1 512-555-0100',
      websiteUri: 'https://acme-plumbing.com',
      googleMapsUri: 'https://maps.google.com/?cid=123',
      primaryType: 'plumber',
      types: ['plumber', 'point_of_interest'],
      businessStatus: 'OPERATIONAL',
      rating: 4.7,
      userRatingCount: 82,
      regularOpeningHours: { weekdayDescriptions: ['Monday: 8AM–6PM'] },
    };

    const mapped = mapApiResultToSearchResult(apiResult);

    expect(mapped.placeId).toBe('place_123');
    expect(mapped.name).toBe('Acme Plumbing');
    expect(mapped.address).toEqual({
      line1: '123 Main St',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'US',
    });
    expect(mapped.phone).toBe('+1 512-555-0100');
    expect(mapped.websiteUrl).toBe('https://acme-plumbing.com');
    expect(mapped.googleMapsUrl).toBe('https://maps.google.com/?cid=123');
    expect(mapped.mappedIndustry).toBe('plumbing');
    expect(mapped.rating).toBe(4.7);
    expect(mapped.userRatingCount).toBe(82);
    expect(mapped.businessStatus).toBe('OPERATIONAL');
    expect(mapped.openingHoursSummary).toBe('Monday: 8AM–6PM');

    // No field on the mapped shape may carry photo data.
    expect(Object.keys(mapped).join(',')).not.toMatch(/photo/i);
  });

  it('falls back to the national phone number when no international number is present', () => {
    const mapped = mapApiResultToSearchResult({
      id: 'place_456',
      nationalPhoneNumber: '(512) 555-0100',
    });
    expect(mapped.phone).toBe('(512) 555-0100');
  });

  it('falls back to a placeholder name when displayName and formattedAddress are both absent', () => {
    const mapped = mapApiResultToSearchResult({ id: 'place_789' });
    expect(mapped.name).toBe('Unknown business');
    expect(mapped.mappedIndustry).toBeUndefined();
  });
});
