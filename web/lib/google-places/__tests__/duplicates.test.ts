/**
 * Unit tests for Stage 12 duplicate detection. `checkDuplicatesAgainstList`
 * is pure (no I/O); `findDuplicateSignals`/`findDuplicateSignalsForBatch`
 * mock the business repository — no real DynamoDB calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Business } from '@/domain/models/business';

const { mockGetBusinessByGooglePlaceId, mockListAllBusinesses } = vi.hoisted(() => ({
  mockGetBusinessByGooglePlaceId: vi.fn(),
  mockListAllBusinesses: vi.fn(),
}));

vi.mock('@/lib/db/businesses', () => ({
  getBusinessByGooglePlaceId: mockGetBusinessByGooglePlaceId,
  listAllBusinesses: mockListAllBusinesses,
}));

vi.mock('server-only', () => ({}));

import {
  checkDuplicatesAgainstList,
  findDuplicateSignals,
  findDuplicateSignalsForBatch,
} from '../duplicates';

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_00000000-0000-0000-0000-000000000001',
    slug: 'acme-plumbing',
    name: 'Acme Plumbing',
    industry: 'plumbing',
    source: 'manual',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkDuplicatesAgainstList', () => {
  it('flags a matching normalized domain as blocking', () => {
    const existing = makeBusiness({ websiteUrl: 'https://www.acme-plumbing.com/' });
    const signals = checkDuplicatesAgainstList(
      { placeId: 'place_1', name: 'Different Name', websiteUrl: 'http://acme-plumbing.com' },
      [existing],
    );
    expect(signals).toEqual([
      { type: 'domain', confidence: 'blocking', matchedBusinessId: existing.businessId, matchedBusinessName: existing.name },
    ]);
  });

  it('flags a matching normalized phone as blocking', () => {
    const existing = makeBusiness({ phone: '(512) 555-0100' });
    const signals = checkDuplicatesAgainstList(
      { placeId: 'place_1', name: 'Different Name', phone: '+1 512-555-0100' },
      [existing],
    );
    expect(signals.some((s) => s.type === 'phone' && s.confidence === 'blocking')).toBe(true);
  });

  it('flags matching normalized name + full address as blocking', () => {
    const existing = makeBusiness({
      address: { line1: '123 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
    });
    const signals = checkDuplicatesAgainstList(
      {
        placeId: 'place_1',
        name: 'Acme Plumbing',
        address: { line1: '123 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
      },
      [existing],
    );
    expect(signals.some((s) => s.type === 'name_address' && s.confidence === 'blocking')).toBe(true);
  });

  it('flags matching normalized name + city as a warning only (not blocking)', () => {
    const existing = makeBusiness({
      address: { line1: '999 Other St', city: 'Austin', state: 'TX', postalCode: '78702', country: 'US' },
    });
    const signals = checkDuplicatesAgainstList(
      {
        placeId: 'place_1',
        name: 'Acme Plumbing',
        address: { line1: '123 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
      },
      [existing],
    );
    expect(signals).toEqual([
      {
        type: 'name_city',
        confidence: 'warning',
        matchedBusinessId: existing.businessId,
        matchedBusinessName: existing.name,
      },
    ]);
  });

  it('returns no signals when nothing matches', () => {
    const existing = makeBusiness();
    const signals = checkDuplicatesAgainstList(
      {
        placeId: 'place_1',
        name: 'Totally Different Co',
        websiteUrl: 'https://totally-different.com',
        phone: '999-999-9999',
        address: { line1: '1 Other Rd', city: 'Dallas', state: 'TX', postalCode: '75201', country: 'US' },
      },
      [existing],
    );
    expect(signals).toEqual([]);
  });
});

describe('findDuplicateSignals', () => {
  it('short-circuits on a definitive Place ID match', async () => {
    const existing = makeBusiness({ googlePlaceId: 'place_1' });
    mockGetBusinessByGooglePlaceId.mockResolvedValueOnce(existing);

    const signals = await findDuplicateSignals({ placeId: 'place_1', name: 'Acme Plumbing' });

    expect(signals).toEqual([
      { type: 'place_id', confidence: 'blocking', matchedBusinessId: existing.businessId, matchedBusinessName: existing.name },
    ]);
    expect(mockListAllBusinesses).not.toHaveBeenCalled();
  });

  it('falls back to a full-list scan when no Place ID match exists', async () => {
    mockGetBusinessByGooglePlaceId.mockResolvedValueOnce(null);
    mockListAllBusinesses.mockResolvedValueOnce([makeBusiness({ phone: '5125550100' })]);

    const signals = await findDuplicateSignals({ placeId: 'place_2', name: 'Other', phone: '512-555-0100' });

    expect(signals.some((s) => s.type === 'phone')).toBe(true);
  });
});

describe('findDuplicateSignalsForBatch', () => {
  it('loads the business list once and reuses it for every candidate', async () => {
    mockGetBusinessByGooglePlaceId.mockResolvedValue(null);
    mockListAllBusinesses.mockResolvedValueOnce([makeBusiness({ phone: '5125550100' })]);

    const result = await findDuplicateSignalsForBatch([
      { placeId: 'place_a', name: 'A', phone: '512-555-0100' },
      { placeId: 'place_b', name: 'B' },
    ]);

    expect(mockListAllBusinesses).toHaveBeenCalledOnce();
    expect(result.get('place_a')?.some((s) => s.type === 'phone')).toBe(true);
    expect(result.get('place_b')).toEqual([]);
  });
});
