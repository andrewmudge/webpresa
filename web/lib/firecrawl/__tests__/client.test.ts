/**
 * Unit tests for the server-only Firecrawl scrape client. `fetch` and the
 * Secrets Manager wrapper are mocked — no real network or AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetFirecrawlSecret = vi.hoisted(() => vi.fn());

vi.mock('@/lib/secrets', () => ({
  getFirecrawlSecret: mockGetFirecrawlSecret,
}));

vi.mock('server-only', () => ({}));

import { scrapeWebsite, FirecrawlApiError } from '../client';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetFirecrawlSecret.mockResolvedValue({ apiKey: 'fc-test-key' });
});

describe('scrapeWebsite', () => {
  it('sends the API key as a Bearer token and never in the URL/body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { markdown: '# Hello', metadata: { statusCode: 200 } } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await scrapeWebsite('https://example.com');

    expect(result.markdown).toBe('# Hello');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.firecrawl.dev/v2/scrape');
    expect(init.headers.Authorization).toBe('Bearer fc-test-key');
    expect(init.body).not.toContain('fc-test-key');
    expect(JSON.parse(init.body).url).toBe('https://example.com');

    vi.unstubAllGlobals();
  });

  it('categorizes a 429 and reads Retry-After', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '5' }),
        json: async () => ({ error: 'Request rate limit exceeded.' }),
      }),
    );

    const error = await scrapeWebsite('https://example.com').catch((e) => e);
    expect(error).toBeInstanceOf(FirecrawlApiError);
    expect(error.category).toBe('rate_limit');
    expect(error.retryAfterSeconds).toBe(5);

    vi.unstubAllGlobals();
  });

  it('categorizes a 401 as auth', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: async () => ({ error: 'Invalid API key' }),
      }),
    );

    await expect(scrapeWebsite('https://example.com')).rejects.toMatchObject({ category: 'auth' });
    vi.unstubAllGlobals();
  });

  it('categorizes a 500 as provider_error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({ error: 'Internal error' }),
      }),
    );

    await expect(scrapeWebsite('https://example.com')).rejects.toMatchObject({ category: 'provider_error' });
    vi.unstubAllGlobals();
  });

  it('categorizes a network failure as unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(scrapeWebsite('https://example.com')).rejects.toMatchObject({ category: 'unreachable' });
    vi.unstubAllGlobals();
  });

  it('throws provider_error when success is false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false, error: 'scrape failed' }) }),
    );
    await expect(scrapeWebsite('https://example.com')).rejects.toMatchObject({ category: 'provider_error' });
    vi.unstubAllGlobals();
  });
});
