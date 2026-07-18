/**
 * Unit tests for the Stage 12 Discover Server Actions. All Google Places
 * calls, duplicate detection, and DynamoDB writes are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GooglePlaceSearchResult } from '@/domain/models/google-places';

const {
  mockGetSession,
  mockSearchGooglePlaces,
  mockFindDuplicateSignalsForBatch,
  mockPutBusiness,
  mockResolveUniqueSlug,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSearchGooglePlaces: vi.fn(),
  mockFindDuplicateSignalsForBatch: vi.fn(),
  mockPutBusiness: vi.fn(),
  mockResolveUniqueSlug: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: mockGetSession,
}));

vi.mock('@/lib/google-places/search', () => ({
  searchGooglePlaces: mockSearchGooglePlaces,
}));

vi.mock('@/lib/google-places/duplicates', () => ({
  findDuplicateSignalsForBatch: mockFindDuplicateSignalsForBatch,
}));

vi.mock('@/lib/db/businesses', () => ({
  putBusiness: mockPutBusiness,
  resolveUniqueSlug: mockResolveUniqueSlug,
}));

vi.mock('server-only', () => ({}));

import { searchPlacesAction, importSelectedPlacesAction } from '../actions';
import { GooglePlacesApiError } from '@/lib/google-places/client';

function makeResult(overrides: Partial<GooglePlaceSearchResult> = {}): GooglePlaceSearchResult {
  return {
    placeId: 'place_1',
    name: 'Acme Plumbing',
    formattedAddress: '123 Main St, Austin, TX 78701, USA',
    address: { line1: '123 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
    phone: '+1 512-555-0100',
    websiteUrl: 'https://acme-plumbing.com',
    mappedIndustry: 'plumbing',
    rating: 4.7,
    userRatingCount: 82,
    duplicateSignals: [],
    ...overrides,
  };
}

function formDataWithSelectedResult(
  result: GooglePlaceSearchResult,
  opts: { selected?: boolean; industry?: string; confirmDuplicate?: boolean } = {},
): FormData {
  const fd = new FormData();
  fd.set('resultData.0', JSON.stringify(result));
  if (opts.selected ?? true) fd.set('selected.0', '1');
  if (opts.industry !== undefined) fd.set('industry.0', opts.industry);
  if (opts.confirmDuplicate) fd.set('confirmDuplicate.0', '1');
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ sub: 'admin', expiresAt: new Date().toISOString() });
});

describe('searchPlacesAction', () => {
  it('rejects unauthenticated requests', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const fd = new FormData();
    fd.set('industry', 'plumbing');
    fd.set('location', 'Austin, TX');

    const state = await searchPlacesAction(undefined, fd);

    expect(state?.error).toBe('Unauthorized');
    expect(mockSearchGooglePlaces).not.toHaveBeenCalled();
  });

  it('rejects an invalid industry or missing location', async () => {
    const fd = new FormData();
    fd.set('industry', 'not-an-industry');
    fd.set('location', '');

    const state = await searchPlacesAction(undefined, fd);

    expect(state?.error).toBeTruthy();
    expect(mockSearchGooglePlaces).not.toHaveBeenCalled();
  });

  it('returns results on a successful search', async () => {
    const results = [makeResult()];
    mockSearchGooglePlaces.mockResolvedValueOnce(results);
    const fd = new FormData();
    fd.set('industry', 'plumbing');
    fd.set('location', 'Austin, TX');

    const state = await searchPlacesAction(undefined, fd);

    expect(state?.results).toEqual(results);
    expect(state?.error).toBeUndefined();
  });

  it('returns a safe message for a quota-exceeded provider error', async () => {
    mockSearchGooglePlaces.mockRejectedValueOnce(
      new GooglePlacesApiError('quota_exceeded', 'raw provider detail that should not leak'),
    );
    const fd = new FormData();
    fd.set('industry', 'plumbing');
    fd.set('location', 'Austin, TX');

    const state = await searchPlacesAction(undefined, fd);

    expect(state?.error).toMatch(/quota/i);
    expect(state?.error).not.toMatch(/raw provider detail/);
  });
});

describe('importSelectedPlacesAction', () => {
  it('rejects unauthenticated requests', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const state = await importSelectedPlacesAction(undefined, formDataWithSelectedResult(makeResult()));
    expect(state?.failures[0]?.reason).toBe('Unauthorized');
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('imports nothing when no row is selected', async () => {
    const state = await importSelectedPlacesAction(
      undefined,
      formDataWithSelectedResult(makeResult(), { selected: false }),
    );
    expect(state).toEqual({ imported: 0, duplicates: 0, failed: 0, failures: [] });
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('imports a selected, non-duplicate result', async () => {
    mockFindDuplicateSignalsForBatch.mockResolvedValueOnce(new Map([['place_1', []]]));
    mockResolveUniqueSlug.mockResolvedValueOnce('acme-plumbing');
    mockPutBusiness.mockResolvedValueOnce(undefined);

    const state = await importSelectedPlacesAction(
      undefined,
      formDataWithSelectedResult(makeResult(), { industry: 'plumbing' }),
    );

    expect(state?.imported).toBe(1);
    expect(state?.failed).toBe(0);
    expect(state?.duplicates).toBe(0);
    expect(mockPutBusiness).toHaveBeenCalledOnce();
    const savedBusiness = mockPutBusiness.mock.calls[0][0];
    expect(savedBusiness.source).toBe('google_places');
    expect(savedBusiness.status).toBe('pending');
    expect(savedBusiness.googlePlaceId).toBe('place_1');
    expect(savedBusiness.googleRating).toBe(4.7);
    expect(savedBusiness.googleReviewCount).toBe(82);
  });

  it('skips a blocking duplicate without an explicit override', async () => {
    mockFindDuplicateSignalsForBatch.mockResolvedValueOnce(
      new Map([
        [
          'place_1',
          [{ type: 'domain', confidence: 'blocking', matchedBusinessId: 'biz_x', matchedBusinessName: 'Existing Co' }],
        ],
      ]),
    );

    const state = await importSelectedPlacesAction(
      undefined,
      formDataWithSelectedResult(makeResult(), { industry: 'plumbing' }),
    );

    expect(state?.duplicates).toBe(1);
    expect(state?.imported).toBe(0);
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('imports a blocking duplicate when the admin explicitly confirms', async () => {
    mockFindDuplicateSignalsForBatch.mockResolvedValueOnce(
      new Map([
        [
          'place_1',
          [{ type: 'domain', confidence: 'blocking', matchedBusinessId: 'biz_x', matchedBusinessName: 'Existing Co' }],
        ],
      ]),
    );
    mockResolveUniqueSlug.mockResolvedValueOnce('acme-plumbing-2');
    mockPutBusiness.mockResolvedValueOnce(undefined);

    const state = await importSelectedPlacesAction(
      undefined,
      formDataWithSelectedResult(makeResult(), { industry: 'plumbing', confirmDuplicate: true }),
    );

    expect(state?.imported).toBe(1);
    expect(state?.duplicates).toBe(0);
  });

  it('fails a row with no mapped or chosen industry, without blocking other rows', async () => {
    mockFindDuplicateSignalsForBatch.mockResolvedValueOnce(new Map([['place_1', []]]));

    const state = await importSelectedPlacesAction(
      undefined,
      formDataWithSelectedResult(makeResult({ mappedIndustry: undefined }), { industry: '' }),
    );

    expect(state?.failed).toBe(1);
    expect(state?.failures[0]?.reason).toBe('No industry selected');
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('records a per-row failure without rolling back other successful imports', async () => {
    const fd = new FormData();
    fd.set('resultData.0', JSON.stringify(makeResult({ placeId: 'place_1', name: 'Good Co' })));
    fd.set('selected.0', '1');
    fd.set('industry.0', 'plumbing');
    fd.set('resultData.1', JSON.stringify(makeResult({ placeId: 'place_2', name: 'Bad Co' })));
    fd.set('selected.1', '1');
    fd.set('industry.1', 'plumbing');

    mockFindDuplicateSignalsForBatch.mockResolvedValueOnce(
      new Map([
        ['place_1', []],
        ['place_2', []],
      ]),
    );
    mockResolveUniqueSlug.mockResolvedValueOnce('good-co').mockResolvedValueOnce('bad-co');
    mockPutBusiness
      .mockResolvedValueOnce(undefined) // Good Co succeeds
      .mockRejectedValueOnce(new Error('DynamoDB write failed')); // Bad Co fails

    const state = await importSelectedPlacesAction(undefined, fd);

    expect(state?.imported).toBe(1);
    expect(state?.failed).toBe(1);
    expect(state?.failures[0]?.name).toBe('Bad Co');
  });

  it('rejects malformed hidden-field JSON as a failure, not a crash', async () => {
    const fd = new FormData();
    fd.set('resultData.0', '{not valid json');
    fd.set('selected.0', '1');

    const state = await importSelectedPlacesAction(undefined, fd);

    expect(state?.failed).toBe(1);
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });
});
