/**
 * Unit tests for self-service duplicate resolution — the four-outcome
 * table from the self-service funnel design analysis: no match, unclaimed
 * match (attach), and any owned business (blocked, fail-closed, whether
 * claimed-unpaid or an active paying customer).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Business } from '@/domain/models/business';

const { mockGetBusinessById, mockListAllBusinesses } = vi.hoisted(() => ({
  mockGetBusinessById: vi.fn(),
  mockListAllBusinesses: vi.fn(),
}));

vi.mock('@/lib/db/businesses', () => ({
  getBusinessById: mockGetBusinessById,
  listAllBusinesses: mockListAllBusinesses,
}));
vi.mock('server-only', () => ({}));

import { resolveDuplicateForSelfService } from '../resolve-duplicate';

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

describe('resolveDuplicateForSelfService', () => {
  it('creates a new business when nothing matches', async () => {
    mockListAllBusinesses.mockResolvedValueOnce([]);
    const result = await resolveDuplicateForSelfService({ name: 'Brand New Co' });
    expect(result).toEqual({ outcome: 'create' });
    expect(mockGetBusinessById).not.toHaveBeenCalled();
  });

  it('ignores a warning-only (name+city) signal — treats it as no match', async () => {
    mockListAllBusinesses.mockResolvedValueOnce([
      makeBusiness({ address: { line1: '999 Other St', city: 'Austin', state: 'TX', postalCode: '78702', country: 'US' } }),
    ]);
    const result = await resolveDuplicateForSelfService({
      name: 'Acme Plumbing',
      address: { line1: '123 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
    });
    expect(result).toEqual({ outcome: 'create' });
  });

  it('attaches to an unclaimed blocking match instead of creating a duplicate', async () => {
    const existing = makeBusiness({ phone: '5125550100' });
    mockListAllBusinesses.mockResolvedValueOnce([existing]);
    mockGetBusinessById.mockResolvedValueOnce(existing);

    const result = await resolveDuplicateForSelfService({ name: 'Different Name', phone: '512-555-0100' });

    expect(result).toEqual({ outcome: 'attach', businessId: existing.businessId });
  });

  it('fails closed on a claimed-but-unpaid blocking match', async () => {
    const existing = makeBusiness({ phone: '5125550100', ownerUserId: 'cognito-sub-1' });
    mockListAllBusinesses.mockResolvedValueOnce([existing]);
    mockGetBusinessById.mockResolvedValueOnce(existing);

    const result = await resolveDuplicateForSelfService({ name: 'Different Name', phone: '512-555-0100' });

    expect(result).toEqual({ outcome: 'blocked' });
  });

  it('fails closed identically on an active paying customer', async () => {
    const existing = makeBusiness({
      phone: '5125550100',
      ownerUserId: 'cognito-sub-1',
      status: 'customer',
      subscriptionStatus: 'active',
    });
    mockListAllBusinesses.mockResolvedValueOnce([existing]);
    mockGetBusinessById.mockResolvedValueOnce(existing);

    const result = await resolveDuplicateForSelfService({ name: 'Different Name', phone: '512-555-0100' });

    expect(result).toEqual({ outcome: 'blocked' });
  });

  it('treats a vanished matched business (concurrent delete) as no match', async () => {
    mockListAllBusinesses.mockResolvedValueOnce([makeBusiness({ phone: '5125550100' })]);
    mockGetBusinessById.mockResolvedValueOnce(null);

    const result = await resolveDuplicateForSelfService({ name: 'Different Name', phone: '512-555-0100' });

    expect(result).toEqual({ outcome: 'create' });
  });
});
