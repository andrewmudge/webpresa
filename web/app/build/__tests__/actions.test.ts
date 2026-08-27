/**
 * Unit tests for submitBuildAction — the `/build` intake's single Server
 * Action: validate → start the build (create/attach business, trigger the
 * scan workflow) → mint the build-session cookie → redirect to
 * /build/[buildId]. Logo/photo files are no longer part of this request at
 * all — they're uploaded individually, on selection, by
 * `/api/build/upload` (see that route's doc comment for why bundling them
 * into this one final submission doesn't work on Vercel); this action only
 * ever receives already-uploaded `logoUrl`/`photoUrls` as plain text.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
);
const mockCookieSet = vi.hoisted(() => vi.fn());
const mockHeadersGet = vi.hoisted(() => vi.fn());
const mockStartSelfServiceBuild = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockSignBuildSession = vi.hoisted(() => vi.fn());
const mockResolveRuntimeEnvironment = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ set: mockCookieSet }),
  headers: async () => ({ get: mockHeadersGet }),
}));
vi.mock('@/lib/build/start-self-service-build', () => ({ startSelfServiceBuild: mockStartSelfServiceBuild }));
vi.mock('@/lib/db/claims', () => ({
  buildSelfServiceBuildRateLimitKey: (scope: string, windowBucket: string) => `RATELIMIT#${scope}#${windowBucket}`,
  checkAndIncrementSelfServiceBuildRateLimit: mockCheckRateLimit,
}));
vi.mock('@/lib/auth/build-session', () => ({
  signBuildSession: mockSignBuildSession,
  BUILD_SESSION_COOKIE_NAME: 'webpresa_build_session',
  BUILD_SESSION_MAX_AGE_SECONDS: 7200,
}));
vi.mock('@/lib/env/runtime-environment', () => ({ resolveRuntimeEnvironment: mockResolveRuntimeEnvironment }));

import { submitBuildAction } from '../actions';

function baseFormData(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set('name', 'Acme Plumbing');
  fd.set('industry', 'plumbing');
  fd.set('phone', '512-555-0100');
  fd.set('hasExistingWebsite', 'false');
  // Old enough to clear MIN_FORM_FILL_MS (1500ms) — a real visitor filling
  // out a multi-step form always submits well after this.
  fd.set('renderedAt', (Date.now() - 10_000).toString());
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockStartSelfServiceBuild.mockResolvedValue({ status: 'started', businessId: 'biz_1', scanExecutionId: 'scanexec_1' });
  mockSignBuildSession.mockResolvedValue('signed-token');
  mockCheckRateLimit.mockResolvedValue(true);
  mockHeadersGet.mockReturnValue(null);
  // Default to production so every existing test below still exercises the
  // rate limit exactly as before — the dev-bypass tests override this.
  mockResolveRuntimeEnvironment.mockReturnValue('production');
});

describe('submitBuildAction', () => {
  it('returns a validation error and never touches orchestration when required fields are missing', async () => {
    const fd = baseFormData();
    fd.delete('phone');

    const result = await submitBuildAction(undefined, fd);

    expect(result?.error).toBeTruthy();
    expect(mockStartSelfServiceBuild).not.toHaveBeenCalled();
  });

  it('surfaces the blocked-duplicate message', async () => {
    mockStartSelfServiceBuild.mockResolvedValueOnce({ status: 'blocked', message: 'This business may already be set up with Webpresa.' });

    const result = await submitBuildAction(undefined, baseFormData());

    expect(result?.error).toContain('already be set up');
  });

  it('redirects to /build/[scanExecutionId] on success and sets the build-session cookie', async () => {
    await expect(submitBuildAction(undefined, baseFormData())).rejects.toThrow('REDIRECT:/build/scanexec_1');

    expect(mockSignBuildSession).toHaveBeenCalledWith({ businessId: 'biz_1', buildId: 'scanexec_1' });
    expect(mockCookieSet).toHaveBeenCalledWith(
      'webpresa_build_session',
      'signed-token',
      expect.objectContaining({ httpOnly: true, maxAge: 7200 }),
    );
  });

  it('passes already-uploaded logoUrl/photoUrls straight through as plain text — never expects a File', async () => {
    const fd = baseFormData();
    fd.set('logoUrl', '/api/assets/businesses/draft-x/assets/logo.png');
    fd.append('photoUrls', '/api/assets/businesses/draft-x/assets/photos/1.png');
    fd.append('photoUrls', '/api/assets/businesses/draft-x/assets/photos/2.png');

    await expect(submitBuildAction(undefined, fd)).rejects.toThrow('REDIRECT:');

    const [input] = mockStartSelfServiceBuild.mock.calls[0];
    expect(input.logoUrl).toBe('/api/assets/businesses/draft-x/assets/logo.png');
    expect(input.photoUrls).toEqual([
      '/api/assets/businesses/draft-x/assets/photos/1.png',
      '/api/assets/businesses/draft-x/assets/photos/2.png',
    ]);
  });

  it('omits logoUrl/photoUrls entirely when no files were uploaded', async () => {
    await expect(submitBuildAction(undefined, baseFormData())).rejects.toThrow('REDIRECT:');

    const [input] = mockStartSelfServiceBuild.mock.calls[0];
    expect(input.logoUrl).toBeUndefined();
    expect(input.photoUrls).toBeUndefined();
  });

  it('surfaces a friendlier message than the raw workflow-conflict text', async () => {
    mockStartSelfServiceBuild.mockResolvedValueOnce({ status: 'conflict', message: 'A scan workflow for this business is already queued or running.' });

    const result = await submitBuildAction(undefined, baseFormData());

    expect(result?.error).toBe('A build for this business is already in progress.');
  });

  it('requires a websiteUrl when hasExistingWebsite is true', async () => {
    const result = await submitBuildAction(undefined, baseFormData({ hasExistingWebsite: 'true' }));
    expect(result?.error).toContain('website');
    expect(mockStartSelfServiceBuild).not.toHaveBeenCalled();
  });

  it('silently rejects a honeypot-tripped submission with a generic error, before any orchestration', async () => {
    const fd = baseFormData();
    fd.set('website', 'http://spam.example'); // HONEYPOT_FIELD_NAME — real visitors never fill this in

    const result = await submitBuildAction(undefined, fd);

    expect(result?.error).toBeTruthy();
    expect(mockStartSelfServiceBuild).not.toHaveBeenCalled();
  });

  it('rejects a too-fast submission (bot-speed) before any orchestration', async () => {
    const result = await submitBuildAction(undefined, baseFormData({ renderedAt: Date.now().toString() }));

    expect(result?.error).toBeTruthy();
    expect(mockStartSelfServiceBuild).not.toHaveBeenCalled();
  });

  it('rejects once the per-IP daily rate limit is reached, before any orchestration', async () => {
    mockCheckRateLimit.mockResolvedValueOnce(false);

    const result = await submitBuildAction(undefined, baseFormData());

    expect(result?.error).toContain('Too many attempts');
    expect(mockStartSelfServiceBuild).not.toHaveBeenCalled();
  });

  it('hashes the forwarded IP into the rate-limit bucket key rather than using it raw', async () => {
    mockHeadersGet.mockImplementation((name: string) => (name === 'x-forwarded-for' ? '203.0.113.5' : null));

    await expect(submitBuildAction(undefined, baseFormData())).rejects.toThrow('REDIRECT:');

    const bucketKey: string = mockCheckRateLimit.mock.calls[0][0].bucketKey;
    expect(bucketKey).toContain('RATELIMIT#self_service_build#ip#');
    expect(bucketKey).not.toContain('203.0.113.5');
  });

  it('skips the rate limit entirely outside production (dev/Preview/local) — testing is never throttled', async () => {
    mockResolveRuntimeEnvironment.mockReturnValue('development');
    mockCheckRateLimit.mockResolvedValueOnce(false); // would reject if the check ran at all

    await expect(submitBuildAction(undefined, baseFormData())).rejects.toThrow('REDIRECT:');

    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it('skips the rate limit on a Vercel Preview deployment too, not just plain "development"', async () => {
    mockResolveRuntimeEnvironment.mockReturnValue('preview');

    await expect(submitBuildAction(undefined, baseFormData())).rejects.toThrow('REDIRECT:');

    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it('still enforces the rate limit when the resolved environment is genuinely production', async () => {
    mockResolveRuntimeEnvironment.mockReturnValue('production');
    mockCheckRateLimit.mockResolvedValueOnce(false);

    const result = await submitBuildAction(undefined, baseFormData());

    expect(result?.error).toContain('Too many attempts');
  });
});
