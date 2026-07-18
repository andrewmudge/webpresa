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

import { searchPlacesText, GooglePlacesApiError } from '../client';

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
    expect(JSON.parse(init.body)).toEqual({ textQuery: 'plumbers in Austin, TX' });

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
