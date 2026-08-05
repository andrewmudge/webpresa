/**
 * Unit tests for the manual campaign-code entry Server Action (Stage 21).
 * `resolveCampaignRedirect()` itself is already fully covered by
 * `lib/campaign/__tests__/resolve-redirect.test.ts` — these tests only
 * exercise this action's own glue: input normalization, header-derived
 * params, and cookie/redirect wiring.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockResolveCampaignRedirect = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
);
const mockCookieSet = vi.hoisted(() => vi.fn());
const mockHeadersGet = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));

vi.mock('@/lib/campaign/resolve-redirect', () => ({
  resolveCampaignRedirect: mockResolveCampaignRedirect,
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

vi.mock('next/headers', () => ({
  headers: async () => ({ get: mockHeadersGet }),
  cookies: async () => ({ set: mockCookieSet }),
}));

import { submitCampaignCodeAction } from '../actions';

beforeEach(() => {
  vi.clearAllMocks();
  mockHeadersGet.mockImplementation((name: string) => {
    if (name === 'x-forwarded-for') return '203.0.113.5';
    if (name === 'user-agent') return 'test-agent';
    if (name === 'host') return 'webpresa.com';
    if (name === 'x-forwarded-proto') return 'https';
    return null;
  });
});

function formData(code: string) {
  const fd = new FormData();
  fd.set('code', code);
  return fd;
}

describe('submitCampaignCodeAction', () => {
  it('returns an error for empty input, without calling resolveCampaignRedirect', async () => {
    const result = await submitCampaignCodeAction(undefined, formData('   '));
    expect(result?.error).toBeTruthy();
    expect(mockResolveCampaignRedirect).not.toHaveBeenCalled();
  });

  it('normalizes dash-grouped, lowercase input before resolving', async () => {
    mockResolveCampaignRedirect.mockResolvedValueOnce({ outcome: 'invalid' });
    await submitCampaignCodeAction(undefined, formData('ab23-cd45-ef67-gh89'));
    expect(mockResolveCampaignRedirect).toHaveBeenCalledWith(expect.objectContaining({ campaignCode: 'AB23CD45EF67GH89' }));
  });

  it('returns a generic error for an invalid/unknown code, without redirecting', async () => {
    mockResolveCampaignRedirect.mockResolvedValueOnce({ outcome: 'invalid' });
    const result = await submitCampaignCodeAction(undefined, formData('AB23CD45EF67GH89'));
    expect(result?.error).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects to the resolved destination on success, with no cookie when none is returned', async () => {
    mockResolveCampaignRedirect.mockResolvedValueOnce({ outcome: 'redirect', destinationUrl: 'https://webpresa.com/b/acme' });
    await expect(submitCampaignCodeAction(undefined, formData('AB23CD45EF67GH89'))).rejects.toThrow('REDIRECT:https://webpresa.com/b/acme');
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it('sets the claim-intent cookie before redirecting when one is returned', async () => {
    mockResolveCampaignRedirect.mockResolvedValueOnce({
      outcome: 'redirect',
      destinationUrl: 'https://webpresa.com/b/acme',
      claimIntentCookie: { value: 'signed.jwt', maxAgeSeconds: 1800 },
    });
    await expect(submitCampaignCodeAction(undefined, formData('AB23CD45EF67GH89'))).rejects.toThrow('REDIRECT:');
    expect(mockCookieSet).toHaveBeenCalledWith('webpresa_claim_intent', 'signed.jwt', expect.objectContaining({ maxAge: 1800 }));
  });

  it('passes an empty incomingSearchParams and a same-origin requestUrl derived from headers', async () => {
    mockResolveCampaignRedirect.mockResolvedValueOnce({ outcome: 'invalid' });
    await submitCampaignCodeAction(undefined, formData('AB23CD45EF67GH89'));
    const call = mockResolveCampaignRedirect.mock.calls[0][0];
    expect(call.incomingSearchParams).toBeInstanceOf(URLSearchParams);
    expect(call.incomingSearchParams.toString()).toBe('');
    expect(call.requestUrl).toBe('https://webpresa.com/r');
  });

  it('never persists the raw IP — only a fingerprint-ready hash derived from it', async () => {
    mockResolveCampaignRedirect.mockResolvedValueOnce({ outcome: 'invalid' });
    await submitCampaignCodeAction(undefined, formData('AB23CD45EF67GH89'));
    const call = mockResolveCampaignRedirect.mock.calls[0][0];
    expect(call.ipHash).not.toContain('203.0.113.5');
    expect(call.ipHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
