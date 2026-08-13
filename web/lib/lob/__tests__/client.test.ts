/**
 * Unit tests for the Stage 22.5 live-mode guard wired into `lobRequest`.
 * Secrets Manager and `fetch` are mocked — no real network or AWS calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetLobSecret = vi.hoisted(() => vi.fn());

vi.mock('@/lib/secrets', () => ({
  getLobSecret: mockGetLobSecret,
}));

vi.mock('server-only', () => ({}));

import { lobRequest } from '../client';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.VERCEL_ENV;
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('lobRequest', () => {
  it('sends the request for a test-mode key on a preview deployment', async () => {
    process.env.VERCEL_ENV = 'preview';
    mockGetLobSecret.mockResolvedValue({ apiKey: 'test_abc', webhookSecret: 'whsec' });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'psc_123' }) });
    vi.stubGlobal('fetch', fetchMock);

    const result = await lobRequest('/postcards');

    expect(result).toEqual({ id: 'psc_123' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('sends the request for a live-mode key on a production deployment', async () => {
    process.env.VERCEL_ENV = 'production';
    mockGetLobSecret.mockResolvedValue({ apiKey: 'live_abc', webhookSecret: 'whsec' });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'psc_123' }) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(lobRequest('/postcards')).resolves.toEqual({ id: 'psc_123' });
  });

  it('refuses a live-mode key on a preview deployment before making any request', async () => {
    process.env.VERCEL_ENV = 'preview';
    mockGetLobSecret.mockResolvedValue({ apiKey: 'live_abc', webhookSecret: 'whsec' });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(lobRequest('/postcards')).rejects.toThrow(/Lob: refusing to use a live-mode API key/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
