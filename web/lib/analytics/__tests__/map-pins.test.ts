import { describe, it, expect } from 'vitest';
import type { Business } from '@/domain/models/business';
import type { Postcard } from '@/domain/models/postcard';
import { computeMapPins } from '../map-pins';
import { resolveZipCentroid } from '@/lib/geo/zip-centroid';

const NYC_ADDRESS = { line1: '1 Main St', city: 'New York', state: 'NY', postalCode: '10001', country: 'US' };

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_1',
    slug: 'acme',
    name: 'Acme',
    industry: 'plumbing',
    source: 'manual',
    status: 'outreach',
    address: NYC_ADDRESS,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makePostcard(overrides: Partial<Postcard> = {}): Postcard {
  return {
    postcardId: 'postcard_1',
    businessId: 'biz_1',
    previewId: 'preview_1',
    provider: 'lob',
    status: 'mailed',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('computeMapPins', () => {
  it('excludes a business with zero postcards', () => {
    const business = makeBusiness({ status: 'customer' });
    expect(computeMapPins([business], [])).toEqual([]);
  });

  it('excludes a business whose postcard has not yet reached mailed/delivered and who has not advanced past outreach', () => {
    const business = makeBusiness({ status: 'outreach' });
    const postcard = makePostcard({ status: 'submitted' });
    expect(computeMapPins([business], [postcard])).toEqual([]);
  });

  it('excludes a business whose postal code has no known centroid', () => {
    const business = makeBusiness({ status: 'customer', address: { ...NYC_ADDRESS, postalCode: '00000' } });
    const postcard = makePostcard();
    expect(computeMapPins([business], [postcard])).toEqual([]);
  });

  it('colors a mailed-but-not-yet-engaged business blue', () => {
    const business = makeBusiness({ status: 'outreach' });
    const postcard = makePostcard({ status: 'mailed' });
    const [pin] = computeMapPins([business], [postcard]);
    expect(pin.color).toBe('blue');
  });

  it('colors an engaged business purple, same as claimed', () => {
    const engaged = makeBusiness({ businessId: 'biz_engaged', status: 'engaged' });
    const claimed = makeBusiness({ businessId: 'biz_claimed', status: 'claimed' });
    const postcards = [makePostcard({ businessId: 'biz_engaged' }), makePostcard({ businessId: 'biz_claimed' })];
    const pins = computeMapPins([engaged, claimed], postcards);
    expect(pins.map((p) => p.color)).toEqual(['purple', 'purple']);
  });

  it('colors a paying customer green', () => {
    const business = makeBusiness({ status: 'customer' });
    const [pin] = computeMapPins([business], [makePostcard()]);
    expect(pin.color).toBe('green');
  });

  it('colors a cancelled business red, taking priority over a still-mailed postcard', () => {
    const business = makeBusiness({ status: 'cancelled' });
    const [pin] = computeMapPins([business], [makePostcard({ status: 'mailed' })]);
    expect(pin.color).toBe('red');
  });

  it('most-advanced-stage wins: a cancelled business is red even though it was once a customer', () => {
    // status is forward-rank, so a business currently `cancelled` never
    // shows as `customer` — the record only carries its current status.
    const business = makeBusiness({ status: 'cancelled' });
    const [pin] = computeMapPins([business], [makePostcard()]);
    expect(pin.color).toBe('red');
    expect(pin.color).not.toBe('green');
  });

  it('carries through name, industry, businessStatus, and a resolved lat/lng', () => {
    const business = makeBusiness({ status: 'customer', name: 'Acme Plumbing', industry: 'plumbing' });
    const [pin] = computeMapPins([business], [makePostcard()]);
    expect(pin).toMatchObject({ businessId: 'biz_1', name: 'Acme Plumbing', industry: 'plumbing', businessStatus: 'customer' });
    expect(typeof pin.latitude).toBe('number');
    expect(typeof pin.longitude).toBe('number');
  });

  it('a lone (non-colliding) business is placed exactly at its resolved ZIP centroid, untouched by jitter', () => {
    const business = makeBusiness({ status: 'customer' });
    const [pin] = computeMapPins([business], [makePostcard()]);
    const centroid = resolveZipCentroid(NYC_ADDRESS.postalCode)!;
    expect(pin.latitude).toBe(centroid.latitude);
    expect(pin.longitude).toBe(centroid.longitude);
  });

  it('prefers the real Google Places coordinate over the ZIP centroid when both are present', () => {
    const business = makeBusiness({
      status: 'customer',
      source: 'google_places',
      googlePlaceLatitude: 40.0,
      googlePlaceLongitude: -75.0,
    });
    const [pin] = computeMapPins([business], [makePostcard()]);
    const zipCentroid = resolveZipCentroid(NYC_ADDRESS.postalCode)!;
    expect(pin.latitude).toBe(40.0);
    expect(pin.longitude).toBe(-75.0);
    expect(pin.latitude).not.toBe(zipCentroid.latitude);
    expect(pin.longitude).not.toBe(zipCentroid.longitude);
  });

  it('falls back to the ZIP centroid when a google_places business has no persisted coordinate (predates the backfill)', () => {
    const business = makeBusiness({ status: 'customer', source: 'google_places', googlePlaceId: 'place_1' });
    const [pin] = computeMapPins([business], [makePostcard()]);
    const zipCentroid = resolveZipCentroid(NYC_ADDRESS.postalCode)!;
    expect(pin.latitude).toBe(zipCentroid.latitude);
    expect(pin.longitude).toBe(zipCentroid.longitude);
  });

  it('spreads two businesses colliding at the same resolved centroid to distinct, nearby coordinates', () => {
    const businessA = makeBusiness({ businessId: 'biz_a', status: 'customer' });
    const businessB = makeBusiness({ businessId: 'biz_b', status: 'customer' });
    const postcards = [makePostcard({ businessId: 'biz_a' }), makePostcard({ businessId: 'biz_b' })];
    const pins = computeMapPins([businessA, businessB], postcards);
    const centroid = resolveZipCentroid(NYC_ADDRESS.postalCode)!;

    expect(pins).toHaveLength(2);
    const [pinA, pinB] = pins;

    // Nudged apart, not identical.
    expect(pinA.latitude === pinB.latitude && pinA.longitude === pinB.longitude).toBe(false);

    // But both still close (well within a generous ~1km bound) to the original shared centroid.
    for (const pin of pins) {
      expect(Math.abs(pin.latitude - centroid.latitude)).toBeLessThan(0.01);
      expect(Math.abs(pin.longitude - centroid.longitude)).toBeLessThan(0.01);
    }
  });

  it('the jitter spread is deterministic across repeated calls, regardless of input array order', () => {
    const businessA = makeBusiness({ businessId: 'biz_a', status: 'customer' });
    const businessB = makeBusiness({ businessId: 'biz_b', status: 'customer' });
    const postcards = [makePostcard({ businessId: 'biz_a' }), makePostcard({ businessId: 'biz_b' })];

    const firstRun = computeMapPins([businessA, businessB], postcards);
    const secondRun = computeMapPins([businessB, businessA], postcards); // reversed input order

    const byId = (pins: typeof firstRun) => Object.fromEntries(pins.map((p) => [p.businessId, { latitude: p.latitude, longitude: p.longitude }]));
    expect(byId(firstRun)).toEqual(byId(secondRun));
  });
});
