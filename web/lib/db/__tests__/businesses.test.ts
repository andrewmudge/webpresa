/**
 * Unit tests for the Business repository.
 * All DynamoDB interactions are mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  putBusiness,
  resolveUniqueSlug,
  listBusinesses,
  updateBusiness,
} from '@/lib/db/businesses';
import { createBusiness } from '@/domain/factories/business.factory';

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
