/**
 * Unit tests for the server-only Google Places API client. `fetch` and the
 * Secrets Manager wrapper are mocked — no real network or AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetGooglePlacesSecret } = vi.hoisted(() => ({
  mockGetGooglePlacesSecret: vi.fn(),
}));

vi.mock('@/lib/secrets', () => ({
  getGooglePlacesSecret: mockGetGooglePlacesSecret,
}));

vi.mock('server-only', () => ({}));

import { searchPlacesText, getPlaceReviews, GooglePlacesApiError } from '../client';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetGooglePlacesSecret.mockResolvedValue({ apiKey: 'test-key' });
});

describe('searchPlacesText', () => {
  it('sends the API key and an economical field mask, never a photo field', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ places: [{ id: 'place_1', displayName: { text: 'Acme Plumbing' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchPlacesText('plumbers in Austin, TX');

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('place_1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://places.googleapis.com/v1/places:searchText');
    expect(init.headers['X-Goog-Api-Key']).toBe('test-key');
    expect(init.headers['X-Goog-FieldMask']).not.toMatch(/photo/i);
    // Places API (New) strictly filters the whole response by this mask —
    // nextPageToken must be requested explicitly or Google silently strips
    // it from every response, capping every search at one page (20 results)
    // regardless of how many more places actually match.
    expect(init.headers['X-Goog-FieldMask'].split(',')).toContain('nextPageToken');
    expect(JSON.parse(init.body)).toEqual({ textQuery: 'plumbers in Austin, TX', pageSize: 20 });

    vi.unstubAllGlobals();
  });

  it('follows nextPageToken across multiple pages and combines the results', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ places: [{ id: 'place_1' }], nextPageToken: 'token_1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ places: [{ id: 'place_2' }], nextPageToken: 'token_2' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ places: [{ id: 'place_3' }] }),
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();

    const resultsPromise = searchPlacesText('plumbers in Austin, TX');
    await vi.runAllTimersAsync();
    const results = await resultsPromise;

    expect(results.map((r) => r.id)).toEqual(['place_1', 'place_2', 'place_3']);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ pageToken: 'token_1' });
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toMatchObject({ pageToken: 'token_2' });

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('stops after 3 pages even if Google keeps returning a nextPageToken', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ places: [{ id: 'place_x' }], nextPageToken: 'always_more' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();

    const resultsPromise = searchPlacesText('plumbers in Austin, TX');
    await vi.runAllTimersAsync();
    const results = await resultsPromise;

    expect(results).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('categorizes a quota-exceeded response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: { status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded' } }),
      }),
    );

    await expect(searchPlacesText('x')).rejects.toMatchObject({
      category: 'quota_exceeded',
    });
    expect(await searchPlacesText('x').catch((e) => e)).toBeInstanceOf(GooglePlacesApiError);

    vi.unstubAllGlobals();
  });

  it('categorizes an invalid API key response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'API key invalid' } }),
      }),
    );

    await expect(searchPlacesText('x')).rejects.toMatchObject({ category: 'invalid_key' });

    vi.unstubAllGlobals();
  });

  it('categorizes a network failure as unknown', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    );

    await expect(searchPlacesText('x')).rejects.toMatchObject({ category: 'unknown' });

    vi.unstubAllGlobals();
  });

  it('rejects a response that does not match the expected shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ places: [{ notAPlaceField: true }] }),
      }),
    );

    await expect(searchPlacesText('x')).rejects.toMatchObject({ category: 'unknown' });

    vi.unstubAllGlobals();
  });
});

describe('getPlaceReviews', () => {
  it('sends a GET request to the Place Details endpoint with a reviews-only field mask', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reviews: [{ name: 'places/place_1/reviews/review_1', rating: 5, text: { text: 'Great!' } }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const reviews = await getPlaceReviews('place_1');

    expect(reviews).toHaveLength(1);
    expect(reviews[0].rating).toBe(5);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://places.googleapis.com/v1/places/place_1');
    expect(init.method).toBe('GET');
    expect(init.headers['X-Goog-Api-Key']).toBe('test-key');
    expect(init.headers['X-Goog-FieldMask']).toMatch(/^reviews\./);
    expect(init.headers['X-Goog-FieldMask']).not.toMatch(/photo/i);

    vi.unstubAllGlobals();
  });

  it('returns an empty array when the place has no reviews', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    await expect(getPlaceReviews('place_1')).resolves.toEqual([]);
    vi.unstubAllGlobals();
  });

  it('categorizes a non-2xx response the same way searchPlacesText does', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: { status: 'PERMISSION_DENIED' } }) }),
    );
    await expect(getPlaceReviews('place_1')).rejects.toMatchObject({ category: 'permission_denied' });
    vi.unstubAllGlobals();
  });
});
