/**
 * Unit tests for submitBuildAction — the `/build` intake's single Server
 * Action: validate → create/attach business → upload any files under the
 * real businessId → trigger the scan workflow → mint the build-session
 * cookie → redirect to /build/[buildId].
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
);
const mockCookieSet = vi.hoisted(() => vi.fn());
const mockHeadersGet = vi.hoisted(() => vi.fn());
const mockCreateOrAttach = vi.hoisted(() => vi.fn());
const mockTriggerScan = vi.hoisted(() => vi.fn());
const mockUpdateBusiness = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockUploadBusinessAsset = vi.hoisted(() => vi.fn());
const mockAppendBusinessPhotos = vi.hoisted(() => vi.fn());
const mockSignBuildSession = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ set: mockCookieSet }),
  headers: async () => ({ get: mockHeadersGet }),
}));
vi.mock('@/lib/build/start-self-service-build', () => ({
  createOrAttachSelfServiceBusiness: mockCreateOrAttach,
  triggerSelfServiceScan: mockTriggerScan,
}));
vi.mock('@/lib/db/businesses', () => ({
  updateBusiness: mockUpdateBusiness,
  buildSelfServiceRateLimitKey: (scope: string, windowBucket: string) => `RATELIMIT#${scope}#${windowBucket}`,
  checkAndIncrementSelfServiceBuildRateLimit: mockCheckRateLimit,
}));
vi.mock('@/lib/s3/business-assets', () => ({
  uploadBusinessAsset: mockUploadBusinessAsset,
  appendBusinessPhotos: mockAppendBusinessPhotos,
}));
vi.mock('@/lib/s3/upload-validation', async () => {
  const actual = await vi.importActual<typeof import('@/lib/s3/upload-validation')>('@/lib/s3/upload-validation');
  return actual;
});
vi.mock('@/lib/auth/build-session', () => ({
  signBuildSession: mockSignBuildSession,
  BUILD_SESSION_COOKIE_NAME: 'webpresa_build_session',
  BUILD_SESSION_MAX_AGE_SECONDS: 7200,
}));

import { submitBuildAction } from '../actions';
import { UploadValidationError } from '@/lib/s3/upload-validation';

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
  mockCreateOrAttach.mockResolvedValue({ status: 'ready', businessId: 'biz_1' });
  mockTriggerScan.mockResolvedValue({ status: 'started', scanExecutionId: 'scanexec_1' });
  mockSignBuildSession.mockResolvedValue('signed-token');
  mockCheckRateLimit.mockResolvedValue(true);
  mockHeadersGet.mockReturnValue(null);
});

describe('submitBuildAction', () => {
  it('returns a validation error and never touches orchestration when required fields are missing', async () => {
    const fd = baseFormData();
    fd.delete('phone');

    const result = await submitBuildAction(undefined, fd);

    expect(result?.error).toBeTruthy();
    expect(mockCreateOrAttach).not.toHaveBeenCalled();
  });

  it('surfaces the blocked-duplicate message without triggering a scan', async () => {
    mockCreateOrAttach.mockResolvedValueOnce({ status: 'blocked', message: 'This business may already be set up with Webpresa.' });

    const result = await submitBuildAction(undefined, baseFormData());

    expect(result?.error).toContain('already be set up');
    expect(mockTriggerScan).not.toHaveBeenCalled();
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

  it('uploads a logo file under the real businessId before triggering the scan', async () => {
    mockUploadBusinessAsset.mockResolvedValueOnce('/api/assets/businesses/biz_1/assets/logo.png');
    const fd = baseFormData();
    fd.set('logo', new File([new Uint8Array([1, 2, 3])], 'logo.png', { type: 'image/png' }));

    await expect(submitBuildAction(undefined, fd)).rejects.toThrow('REDIRECT:');

    expect(mockUploadBusinessAsset).toHaveBeenCalledWith('biz_1', expect.any(File), 'logo');
    expect(mockUpdateBusiness).toHaveBeenCalledWith('biz_1', { logoUrl: '/api/assets/businesses/biz_1/assets/logo.png' });
    // Upload must complete (and be persisted) before the workflow starts,
    // so generation never races an in-flight photo upload.
    const uploadCallOrder = mockUploadBusinessAsset.mock.invocationCallOrder[0];
    const triggerCallOrder = mockTriggerScan.mock.invocationCallOrder[0];
    expect(uploadCallOrder).toBeLessThan(triggerCallOrder);
  });

  it('never calls updateBusiness a second time when no files were submitted', async () => {
    await expect(submitBuildAction(undefined, baseFormData())).rejects.toThrow('REDIRECT:');
    expect(mockUpdateBusiness).not.toHaveBeenCalled();
  });

  it('surfaces an UploadValidationError message and never triggers the scan on a bad file', async () => {
    mockUploadBusinessAsset.mockRejectedValueOnce(new UploadValidationError('Unsupported file type — only JPEG, PNG, and WebP images are allowed.'));
    const fd = baseFormData();
    fd.set('logo', new File([new Uint8Array([1, 2, 3])], 'logo.svg', { type: 'image/svg+xml' }));

    const result = await submitBuildAction(undefined, fd);

    expect(result?.error).toContain('JPEG, PNG, and WebP');
    expect(mockTriggerScan).not.toHaveBeenCalled();
  });

  it('surfaces a friendlier message than the raw workflow-conflict text', async () => {
    mockTriggerScan.mockResolvedValueOnce({ status: 'conflict', message: 'A scan workflow for this business is already queued or running.' });

    const result = await submitBuildAction(undefined, baseFormData());

    expect(result?.error).toBe('A build for this business is already in progress.');
  });

  it('requires a websiteUrl when hasExistingWebsite is true', async () => {
    const result = await submitBuildAction(undefined, baseFormData({ hasExistingWebsite: 'true' }));
    expect(result?.error).toContain('website');
    expect(mockCreateOrAttach).not.toHaveBeenCalled();
  });

  it('silently rejects a honeypot-tripped submission with a generic error, before any orchestration', async () => {
    const fd = baseFormData();
    fd.set('website', 'http://spam.example'); // HONEYPOT_FIELD_NAME — real visitors never fill this in

    const result = await submitBuildAction(undefined, fd);

    expect(result?.error).toBeTruthy();
    expect(mockCreateOrAttach).not.toHaveBeenCalled();
  });

  it('rejects a too-fast submission (bot-speed) before any orchestration', async () => {
    const result = await submitBuildAction(undefined, baseFormData({ renderedAt: Date.now().toString() }));

    expect(result?.error).toBeTruthy();
    expect(mockCreateOrAttach).not.toHaveBeenCalled();
  });

  it('rejects once the per-IP daily rate limit is reached, before any orchestration', async () => {
    mockCheckRateLimit.mockResolvedValueOnce(false);

    const result = await submitBuildAction(undefined, baseFormData());

    expect(result?.error).toContain('Too many attempts');
    expect(mockCreateOrAttach).not.toHaveBeenCalled();
  });

  it('hashes the forwarded IP into the rate-limit bucket key rather than using it raw', async () => {
    mockHeadersGet.mockImplementation((name: string) => (name === 'x-forwarded-for' ? '203.0.113.5' : null));

    await expect(submitBuildAction(undefined, baseFormData())).rejects.toThrow('REDIRECT:');

    const bucketKey: string = mockCheckRateLimit.mock.calls[0][0].bucketKey;
    expect(bucketKey).toContain('RATELIMIT#ip#');
    expect(bucketKey).not.toContain('203.0.113.5');
  });
});
