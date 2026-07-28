/**
 * Unit tests for the Business repository.
 * All DynamoDB interactions are mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

// ---------------------------------------------------------------------------
// Mock the DynamoDB client module before importing the module under test
// ---------------------------------------------------------------------------

const mockSend = vi.fn();

vi.mock('@/lib/db/client', () => ({
  getDynamoDBClient: () => ({ send: mockSend }),
  TABLE_BUSINESSES: () => 'webpresa-test-businesses',
}));

// Mock server-only to a no-op (it's a build-time guard, irrelevant in tests)
vi.mock('server-only', () => ({}));

// ---------------------------------------------------------------------------
// Imports (after mocks are set up)
// ---------------------------------------------------------------------------

import {
  getBusinessById,
  getBusinessBySlug,
  getBusinessByGooglePlaceId,
  putBusiness,
  resolveUniqueSlug,
  listBusinesses,
  listAllBusinesses,
  matchesBusinessFilters,
  updateBusiness,
  getBusinessesByOwnerUserId,
  releaseOwnership,
} from '@/lib/db/businesses';
import { createBusiness } from '@/domain/factories/business.factory';
import { createDefaultWebsiteSectionsConfig } from '@/domain/factories/website-sections.factory';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBusiness(overrides = {}) {
  return createBusiness({
    name: 'Acme Plumbing',
    industry: 'plumbing',
    source: 'manual',
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getBusinessById
// ---------------------------------------------------------------------------

describe('getBusinessById', () => {
  it('returns a parsed Business when the item exists', async () => {
    const b = makeBusiness();
    mockSend.mockResolvedValueOnce({ Item: b });

    const result = await getBusinessById(b.businessId);

    expect(result).not.toBeNull();
    expect(result?.businessId).toBe(b.businessId);
    expect(result?.name).toBe('Acme Plumbing');
  });

  it('returns null when the item does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });
    const result = await getBusinessById('biz_notfound');
    expect(result).toBeNull();
  });

  it('throws if DynamoDB returns an invalid record', async () => {
    mockSend.mockResolvedValueOnce({ Item: { businessId: 'bad' } }); // missing required fields
    await expect(getBusinessById('bad')).rejects.toThrow();
  });

  it('tolerates a stored websiteSections entry referencing a removed section type', async () => {
    // Simulates a business saved before the standalone `testimonials`
    // section was removed (merged into `reviews` — see build_log.md).
    // Without read-time tolerance, BusinessSchema's strict
    // z.enum(WEBSITE_SECTION_TYPES) would reject the whole record.
    const b = makeBusiness();
    const legacySections = createDefaultWebsiteSectionsConfig();
    const withStaleEntry = {
      ...b,
      websiteSections: {
        ...legacySections,
        sections: [...legacySections.sections, { component: 'testimonials', enabled: true, order: 80, variant: 'default' }],
      },
    };
    mockSend.mockResolvedValueOnce({ Item: withStaleEntry });

    const result = await getBusinessById(b.businessId);

    expect(result).not.toBeNull();
    // The stray entry is dropped rather than surviving into the parsed
    // record — back down to exactly the known catalog's section count.
    expect(result?.websiteSections?.sections).toHaveLength(legacySections.sections.length);
  });
});

// ---------------------------------------------------------------------------
// getBusinessBySlug
// ---------------------------------------------------------------------------

describe('getBusinessBySlug', () => {
  it('returns the matching business', async () => {
    const b = makeBusiness();
    mockSend.mockResolvedValueOnce({ Items: [b] });

    const result = await getBusinessBySlug(b.slug);

    expect(result?.slug).toBe(b.slug);
  });

  it('returns null when not found', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    const result = await getBusinessBySlug('no-match');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getBusinessByGooglePlaceId
// ---------------------------------------------------------------------------

describe('getBusinessByGooglePlaceId', () => {
  it('queries the google-place-id-index GSI and returns the matching business', async () => {
    // googlePlaceId isn't part of CreateBusinessInput (the factory only
    // accepts a fixed set of creation fields) — set it directly on the
    // resulting record, the same way an import action would.
    const b = { ...makeBusiness(), googlePlaceId: 'place_abc' };
    mockSend.mockResolvedValueOnce({ Items: [b] });

    const result = await getBusinessByGooglePlaceId('place_abc');

    expect(result?.googlePlaceId).toBe('place_abc');
    const arg = mockSend.mock.calls[0][0].input;
    expect(arg.IndexName).toBe('google-place-id-index');
  });

  it('returns null when no business has that Place ID', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    const result = await getBusinessByGooglePlaceId('place_missing');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listAllBusinesses
// ---------------------------------------------------------------------------

describe('listAllBusinesses', () => {
  it('returns all items from a single scan page', async () => {
    const items = [makeBusiness(), makeBusiness()];
    mockSend.mockResolvedValueOnce({ Items: items, LastEvaluatedKey: undefined });

    const result = await listAllBusinesses();

    expect(result).toHaveLength(2);
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('pages through multiple scans until LastEvaluatedKey is exhausted', async () => {
    mockSend
      .mockResolvedValueOnce({ Items: [makeBusiness()], LastEvaluatedKey: { businessId: 'biz_a' } })
      .mockResolvedValueOnce({ Items: [makeBusiness()], LastEvaluatedKey: undefined });

    const result = await listAllBusinesses();

    expect(result).toHaveLength(2);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// putBusiness
// ---------------------------------------------------------------------------

describe('putBusiness', () => {
  it('calls PutCommand with the correct table and item', async () => {
    const b = makeBusiness();
    mockSend.mockResolvedValueOnce({});

    await putBusiness(b);

    expect(mockSend).toHaveBeenCalledOnce();
    const arg = mockSend.mock.calls[0][0].input;
    expect(arg.TableName).toBe('webpresa-test-businesses');
    expect(arg.Item.businessId).toBe(b.businessId);
  });

  it('throws a ZodError when the record is invalid', async () => {
    const invalid = { ...makeBusiness(), status: 'invalid-status' } as unknown as Parameters<typeof putBusiness>[0];
    await expect(putBusiness(invalid)).rejects.toThrow();
    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// resolveUniqueSlug
// ---------------------------------------------------------------------------

describe('resolveUniqueSlug', () => {
  it('returns the base slug when it is not taken', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] }); // slug not found

    const slug = await resolveUniqueSlug('acme-plumbing');

    expect(slug).toBe('acme-plumbing');
  });

  it('appends -2 when the base slug is taken', async () => {
    mockSend
      .mockResolvedValueOnce({ Items: [makeBusiness()] }) // base taken
      .mockResolvedValueOnce({ Items: [] }); // -2 free

    const slug = await resolveUniqueSlug('acme-plumbing');

    expect(slug).toBe('acme-plumbing-2');
  });

  it('finds the next free suffix when multiple slugs are taken', async () => {
    mockSend
      .mockResolvedValueOnce({ Items: [makeBusiness()] }) // base taken
      .mockResolvedValueOnce({ Items: [makeBusiness()] }) // -2 taken
      .mockResolvedValueOnce({ Items: [] }); // -3 free

    const slug = await resolveUniqueSlug('acme-plumbing');

    expect(slug).toBe('acme-plumbing-3');
  });
});

// ---------------------------------------------------------------------------
// listBusinesses
// ---------------------------------------------------------------------------

describe('listBusinesses', () => {
  it('returns items and no cursor when all items are returned', async () => {
    const items = [makeBusiness(), makeBusiness()];
    mockSend.mockResolvedValueOnce({ Items: items, LastEvaluatedKey: undefined });

    const result = await listBusinesses({ limit: 50 });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBeUndefined();
  });

  it('returns a cursor when DynamoDB paginates', async () => {
    const items = [makeBusiness()];
    mockSend.mockResolvedValueOnce({
      Items: items,
      LastEvaluatedKey: { businessId: 'biz_abc' },
    });

    const result = await listBusinesses({ limit: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeDefined();
    expect(typeof result.nextCursor).toBe('string');
  });

  describe('with filters', () => {
    it('filters a single scan page in application code and does not use the unfiltered fast path', async () => {
      const match = makeBusiness({ name: 'Acme Plumbing', industry: 'plumbing' });
      const nonMatch = makeBusiness({ name: 'Other HVAC', industry: 'hvac' });
      mockSend.mockResolvedValueOnce({ Items: [match, nonMatch], LastEvaluatedKey: undefined });

      const result = await listBusinesses({ limit: 50, industry: 'plumbing' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].businessId).toBe(match.businessId);
      expect(result.nextCursor).toBeUndefined();
    });

    it('pages through multiple scans to accumulate enough matches', async () => {
      // `status` isn't part of CreateBusinessInput (the factory always
      // defaults to 'pending') — set it directly on the built record.
      const matchA = { ...makeBusiness({ name: 'A' }), status: 'active' as const };
      const nonMatch = { ...makeBusiness({ name: 'B' }), status: 'pending' as const };
      const matchC = { ...makeBusiness({ name: 'C' }), status: 'active' as const };

      mockSend
        .mockResolvedValueOnce({ Items: [matchA, nonMatch], LastEvaluatedKey: { businessId: 'cursor1' } })
        .mockResolvedValueOnce({ Items: [matchC], LastEvaluatedKey: undefined });

      const result = await listBusinesses({ limit: 50, status: 'active' });

      expect(result.items.map((b) => b.businessId)).toEqual([matchA.businessId, matchC.businessId]);
      expect(result.nextCursor).toBeUndefined();
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('returns a cursor to resume from when the table is not yet exhausted', async () => {
      const match = { ...makeBusiness(), status: 'active' as const };
      mockSend.mockResolvedValueOnce({ Items: [match], LastEvaluatedKey: { businessId: 'cursor1' } });

      const result = await listBusinesses({ limit: 1, status: 'active' });

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeDefined();
    });

    it('stops at the safety cap without throwing when a filter matches nothing', async () => {
      mockSend.mockResolvedValue({ Items: [makeBusiness()], LastEvaluatedKey: { businessId: 'keeps-going' } });

      const result = await listBusinesses({ limit: 50, status: 'active' });

      expect(result.items).toHaveLength(0);
      // Safety cap (40 pages) reached rather than looping forever.
      expect(mockSend).toHaveBeenCalledTimes(40);
    });
  });
});

// ---------------------------------------------------------------------------
// matchesBusinessFilters
// ---------------------------------------------------------------------------

describe('matchesBusinessFilters', () => {
  // `status`/`address` aren't part of CreateBusinessInput — set directly on
  // the built record rather than passed through the factory (which would
  // silently ignore them).
  const business = {
    ...makeBusiness({ name: 'Acme Plumbing', industry: 'plumbing', source: 'manual' }),
    status: 'active' as const,
    address: { line1: '1 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
  };

  it('matches with no filters', () => {
    expect(matchesBusinessFilters(business, {})).toBe(true);
  });

  it('matches exact status/industry/source', () => {
    expect(matchesBusinessFilters(business, { status: 'active', industry: 'plumbing', source: 'manual' })).toBe(true);
  });

  it('rejects a non-matching status', () => {
    expect(matchesBusinessFilters(business, { status: 'archived' })).toBe(false);
  });

  it('matches city/state case-insensitively as a substring', () => {
    expect(matchesBusinessFilters(business, { city: 'aus' })).toBe(true);
    expect(matchesBusinessFilters(business, { state: 'tx' })).toBe(true);
    expect(matchesBusinessFilters(business, { city: 'dallas' })).toBe(false);
  });

  it('rejects a city/state filter when the business has no address', () => {
    const noAddress = makeBusiness(); // address is unset by default — no factory field for it
    expect(matchesBusinessFilters(noAddress, { city: 'austin' })).toBe(false);
  });

  it('includes the whole "createdTo" day, not just midnight', () => {
    const createdToday = { ...business, createdAt: '2026-07-17T23:59:00.000Z' };
    expect(matchesBusinessFilters(createdToday, { createdTo: '2026-07-17' })).toBe(true);
    expect(matchesBusinessFilters(createdToday, { createdFrom: '2026-07-17' })).toBe(true);
    expect(matchesBusinessFilters(createdToday, { createdTo: '2026-07-16' })).toBe(false);
    expect(matchesBusinessFilters(createdToday, { createdFrom: '2026-07-18' })).toBe(false);
  });

  it('matches on qualification (Stage 15)', () => {
    const qualified = { ...business, qualification: 'qualified' as const };
    expect(matchesBusinessFilters(qualified, { qualification: 'qualified' })).toBe(true);
    expect(matchesBusinessFilters(qualified, { qualification: 'reject' })).toBe(false);
  });

  it('rejects a qualification filter when the business has never been scored', () => {
    expect(matchesBusinessFilters(business, { qualification: 'qualified' })).toBe(false);
  });

  it('matches qualification against the admin-override value, not the original AI value, when an override is set', () => {
    const overridden = { ...business, qualification: 'reject' as const, adminReviewedQualification: 'qualified' as const };
    expect(matchesBusinessFilters(overridden, { qualification: 'qualified' })).toBe(true);
    expect(matchesBusinessFilters(overridden, { qualification: 'reject' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateBusiness
// ---------------------------------------------------------------------------

describe('updateBusiness', () => {
  it('merges updates and returns the updated record', async () => {
    const existing = makeBusiness();
    // getBusinessById → returns existing
    mockSend.mockResolvedValueOnce({ Item: existing });
    // UpdateCommand → resolves
    mockSend.mockResolvedValueOnce({});

    const result = await updateBusiness(existing.businessId, { name: 'Acme HVAC', industry: 'hvac' });

    expect(result.name).toBe('Acme HVAC');
    expect(result.industry).toBe('hvac');
    expect(result.businessId).toBe(existing.businessId);
    // updatedAt must be a valid ISO timestamp set during the update
    expect(new Date(result.updatedAt).getTime()).toBeGreaterThan(0);
  });

  it('throws when the business does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(updateBusiness('biz_notfound', { name: 'New Name' })).rejects.toThrow(
      'Business not found',
    );
  });
});

// ---------------------------------------------------------------------------
// getBusinessesByOwnerUserId (Stage 17)
// ---------------------------------------------------------------------------

describe('getBusinessesByOwnerUserId', () => {
  it('queries owner-user-id-index, newest claim first', async () => {
    const business = { ...makeBusiness(), ownerUserId: 'cognito-sub-1', claimedAt: new Date().toISOString() };
    mockSend.mockResolvedValueOnce({ Items: [business] });

    const result = await getBusinessesByOwnerUserId('cognito-sub-1');

    expect(result).toHaveLength(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.IndexName).toBe('owner-user-id-index');
    expect(command.input.ScanIndexForward).toBe(false);
  });

  it('returns multiple businesses for the same owner — no one-account-one-business restriction', async () => {
    const owner = 'cognito-sub-1';
    const businessAId = 'biz_00000000-0000-0000-0000-0000000000aa';
    const businessBId = 'biz_00000000-0000-0000-0000-0000000000bb';
    const businessA = { ...makeBusiness(), businessId: businessAId, ownerUserId: owner, claimedAt: new Date().toISOString() };
    const businessB = { ...makeBusiness(), businessId: businessBId, ownerUserId: owner, claimedAt: new Date().toISOString() };
    mockSend.mockResolvedValueOnce({ Items: [businessA, businessB] });

    const result = await getBusinessesByOwnerUserId(owner);
    expect(result.map((b) => b.businessId)).toEqual([businessAId, businessBId]);
  });
});

// ---------------------------------------------------------------------------
// releaseOwnership (Stage 17 — admin ownership recovery)
// ---------------------------------------------------------------------------

describe('releaseOwnership', () => {
  it('returns true when the business was claimed and ownership is cleared', async () => {
    mockSend.mockResolvedValueOnce({});
    expect(await releaseOwnership('biz_x')).toBe(true);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.ConditionExpression).toBe('attribute_exists(ownerUserId)');
    expect(command.input.UpdateExpression).toContain('REMOVE ownerUserId, claimedAt');
  });

  it('returns false (never throws) when the business is not currently claimed', async () => {
    mockSend.mockRejectedValueOnce(
      new ConditionalCheckFailedException({ message: 'conditional check failed', $metadata: {} }),
    );
    expect(await releaseOwnership('biz_x')).toBe(false);
  });
});
