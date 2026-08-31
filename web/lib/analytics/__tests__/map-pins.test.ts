import { describe, it, expect } from 'vitest';
import type { Business } from '@/domain/models/business';
import type { Postcard } from '@/domain/models/postcard';
import { computeMapPins } from '../map-pins';

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
});
