/**
 * Unit tests for the Lambda entrypoint's state-machine logic — the one
 * piece of Stage 14 that previously had zero automated coverage (only its
 * small pure helper modules, `same-origin.ts` and `capture-token.ts`'s
 * cookie-name export, were tested). Everything AWS/Playwright-touching is
 * mocked; this only exercises the orchestration in `handler.ts` itself.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetItem = vi.hoisted(() => vi.fn());
const mockConditionalUpdateStatus = vi.hoisted(() => vi.fn());
const mockPutScreenshot = vi.hoisted(() => vi.fn());
const mockGetSecretJson = vi.hoisted(() => vi.fn());
const mockValidateOutboundUrl = vi.hoisted(() => vi.fn());
const mockBuildPreviewUrl = vi.hoisted(() => vi.fn());
const mockMintCaptureToken = vi.hoisted(() => vi.fn());
const mockLaunchBrowser = vi.hoisted(() => vi.fn());
const mockCaptureViewport = vi.hoisted(() => vi.fn());

vi.mock('../aws', () => ({
  getItem: mockGetItem,
  conditionalUpdateStatus: mockConditionalUpdateStatus,
  putScreenshot: mockPutScreenshot,
  getSecretJson: mockGetSecretJson,
}));
vi.mock('../url-validation', () => ({ validateOutboundUrl: mockValidateOutboundUrl }));
vi.mock('../same-origin', () => ({ buildPreviewUrl: mockBuildPreviewUrl }));
vi.mock('../capture-token', () => ({ mintCaptureToken: mockMintCaptureToken, CAPTURE_TOKEN_COOKIE_NAME: '__Host-webpresa_capture' }));

// Hand-defined stand-ins, not `importOriginal` — avoids pulling the real
// `playwright-core` import chain (browser.ts's top-level import) into a
// test that never needs it. VIEWPORTS/ScreenshotCaptureError are simple
// enough to duplicate exactly here; drift would be caught immediately by
// browser.ts's own build (VIEWPORTS keys) or by ScreenshotCaptureError's
// `category` union failing to typecheck against `types.ts`.
// `vi.hoisted` because `vi.mock` factories are themselves hoisted above
// ordinary top-level code, including class declarations.
const MockScreenshotCaptureError = vi.hoisted(
  () =>
    class extends Error {
      category: string;
      constructor(message: string, category: string) {
        super(message);
        this.category = category;
      }
    },
);
vi.mock('../browser', () => ({
  launchBrowser: mockLaunchBrowser,
  captureViewport: mockCaptureViewport,
  ScreenshotCaptureError: MockScreenshotCaptureError,
  VIEWPORTS: { desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } },
}));

import { handler } from '../handler';
import type { ScanEventRecord } from '../types';

const BUSINESS_ID = 'biz_1';
const SCAN_ID = 'scan_1';
const PREVIEW_ID = 'preview_1';

function baseEnv() {
  process.env.SCAN_EVENTS_TABLE_NAME = 'scan-events';
  process.env.BUSINESSES_TABLE_NAME = 'businesses';
  process.env.SITE_PREVIEWS_TABLE_NAME = 'site-previews';
  process.env.ASSETS_BUCKET_NAME = 'assets';
  process.env.CAPTURE_TOKEN_SECRET_NAME = 'capture-token';
  process.env.VERCEL_PROTECTION_BYPASS_SECRET_NAME = 'vercel-protection-bypass';
  process.env.WEBPRESA_APP_BASE_URL = 'https://app.example.com';
}

function scanEvent(overrides: Partial<ScanEventRecord> = {}): ScanEventRecord {
  return {
    scanId: SCAN_ID,
    businessId: BUSINESS_ID,
    provider: 'playwright',
    operation: 'screenshot',
    status: 'queued',
    targetType: 'existing_site',
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const FAKE_PNG = Buffer.from('fake-png-bytes');

beforeEach(() => {
  vi.clearAllMocks();
  baseEnv();
  mockConditionalUpdateStatus.mockResolvedValue(true);
  mockPutScreenshot.mockResolvedValue(undefined);
  mockLaunchBrowser.mockResolvedValue({ close: vi.fn().mockResolvedValue(undefined) });
  mockCaptureViewport.mockResolvedValue(FAKE_PNG);
  mockValidateOutboundUrl.mockResolvedValue({ ok: true, normalizedUrl: 'https://acme.com/' });
});

describe('handler — idempotency', () => {
  it('exits without launching a browser when the ScanEvent is already terminal', async () => {
    mockGetItem.mockResolvedValue(scanEvent({ status: 'completed' }));

    await handler({ businessId: BUSINESS_ID, scanId: SCAN_ID, targetType: 'existing_site' });

    expect(mockLaunchBrowser).not.toHaveBeenCalled();
    expect(mockConditionalUpdateStatus).not.toHaveBeenCalled();
  });

  it('exits when the ScanEvent is not found or does not match the payload', async () => {
    mockGetItem.mockResolvedValue(null);
    await handler({ businessId: BUSINESS_ID, scanId: SCAN_ID, targetType: 'existing_site' });
    expect(mockLaunchBrowser).not.toHaveBeenCalled();
  });

  it('exits when the queued→running claim loses the race', async () => {
    mockGetItem.mockResolvedValue(scanEvent({ status: 'queued' }));
    mockConditionalUpdateStatus.mockResolvedValueOnce(false); // the claim attempt fails

    await handler({ businessId: BUSINESS_ID, scanId: SCAN_ID, targetType: 'existing_site' });

    expect(mockConditionalUpdateStatus).toHaveBeenCalledTimes(1);
    expect(mockLaunchBrowser).not.toHaveBeenCalled();
  });

  it('proceeds without re-claiming when the ScanEvent is already running (accepted overlap risk)', async () => {
    mockGetItem
      .mockResolvedValueOnce(scanEvent({ status: 'running' })) // handler's own lookup
      .mockResolvedValue({ websiteUrl: 'https://acme.com' });

    await handler({ businessId: BUSINESS_ID, scanId: SCAN_ID, targetType: 'existing_site' });

    // No queued→running claim call — only the final terminal write.
    expect(mockConditionalUpdateStatus).toHaveBeenCalledTimes(1);
    expect(mockConditionalUpdateStatus.mock.calls[0][0].updates.status).toBe('completed');
  });
});

describe('handler — existing_site', () => {
  it('happy path: both viewports succeed → completed, correct S3 keys', async () => {
    mockGetItem
      .mockResolvedValueOnce(scanEvent({ status: 'queued' }))
      .mockResolvedValueOnce({ websiteUrl: 'https://acme.com' });

    await handler({ businessId: BUSINESS_ID, scanId: SCAN_ID, targetType: 'existing_site' });

    const finalCall = mockConditionalUpdateStatus.mock.calls.at(-1)![0];
    expect(finalCall.updates.status).toBe('completed');
    expect(finalCall.updates.captureResults.desktop).toEqual({
      status: 'completed',
      storageKey: `scans/${BUSINESS_ID}/${SCAN_ID}/existing/desktop.png`,
    });
    expect(finalCall.updates.captureResults.mobile).toEqual({
      status: 'completed',
      storageKey: `scans/${BUSINESS_ID}/${SCAN_ID}/existing/mobile.png`,
    });
    expect(mockPutScreenshot).toHaveBeenCalledTimes(2);
  });

  it('no websiteUrl on the Business → invalid_url, never launches a browser', async () => {
    mockGetItem.mockResolvedValueOnce(scanEvent({ status: 'queued' })).mockResolvedValueOnce({});

    await handler({ businessId: BUSINESS_ID, scanId: SCAN_ID, targetType: 'existing_site' });

    expect(mockLaunchBrowser).not.toHaveBeenCalled();
    const failCall = mockConditionalUpdateStatus.mock.calls.at(-1)![0];
    expect(failCall.updates.status).toBe('failed');
    expect(failCall.updates.failureCategory).toBe('invalid_url');
  });

  it('SSRF-blocked URL → blocked_url, never launches a browser', async () => {
    mockGetItem.mockResolvedValueOnce(scanEvent({ status: 'queued' })).mockResolvedValueOnce({ websiteUrl: 'http://169.254.169.254/' });
    mockValidateOutboundUrl.mockResolvedValue({ ok: false, reason: 'private_or_blocked_address' });

    await handler({ businessId: BUSINESS_ID, scanId: SCAN_ID, targetType: 'existing_site' });

    expect(mockLaunchBrowser).not.toHaveBeenCalled();
    const failCall = mockConditionalUpdateStatus.mock.calls.at(-1)![0];
    expect(failCall.updates.failureCategory).toBe('blocked_url');
  });
});

describe('handler — generated_preview', () => {
  it('happy path: mints a capture token and passes it to captureViewport', async () => {
    mockGetItem
      .mockResolvedValueOnce(scanEvent({ status: 'queued', targetType: 'generated_preview', previewId: PREVIEW_ID }))
      .mockResolvedValueOnce({ previewId: PREVIEW_ID, slug: 'acme-plumbing' });
    mockBuildPreviewUrl.mockReturnValue({ ok: true, url: 'https://app.example.com/b/acme-plumbing' });
    mockGetSecretJson.mockResolvedValue({ signingKey: 'test-key', bypassSecret: 'test-bypass' });
    mockMintCaptureToken.mockResolvedValue('signed.jwt.token');

    await handler({ businessId: BUSINESS_ID, scanId: SCAN_ID, targetType: 'generated_preview', previewId: PREVIEW_ID });

    expect(mockMintCaptureToken).toHaveBeenCalledWith({ previewId: PREVIEW_ID, scanId: SCAN_ID, signingKey: 'test-key' });
    expect(mockCaptureViewport).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://app.example.com/b/acme-plumbing',
        captureToken: { cookieDomain: 'app.example.com', token: 'signed.jwt.token' },
        vercelBypassSecret: 'test-bypass',
        // Stage 25 — generated_preview always threads its own app base URL
        // through as the strict same-origin redirect guard's boundary.
        sameOriginBase: 'https://app.example.com',
      }),
    );
    const finalCall = mockConditionalUpdateStatus.mock.calls.at(-1)![0];
    expect(finalCall.updates.status).toBe('completed');
    expect(finalCall.updates.captureResults.desktop.storageKey).toBe(`scans/${BUSINESS_ID}/${SCAN_ID}/preview/desktop.png`);
  });

  it('missing previewId on the ScanEvent → invalid_url', async () => {
    mockGetItem.mockResolvedValueOnce(scanEvent({ status: 'queued', targetType: 'generated_preview', previewId: undefined }));

    await handler({ businessId: BUSINESS_ID, scanId: SCAN_ID, targetType: 'generated_preview' });

    expect(mockLaunchBrowser).not.toHaveBeenCalled();
    const failCall = mockConditionalUpdateStatus.mock.calls.at(-1)![0];
    expect(failCall.updates.failureCategory).toBe('invalid_url');
  });

  it('referenced SitePreview no longer exists → invalid_url', async () => {
    mockGetItem
      .mockResolvedValueOnce(scanEvent({ status: 'queued', targetType: 'generated_preview', previewId: PREVIEW_ID }))
      .mockResolvedValueOnce(null);

    await handler({ businessId: BUSINESS_ID, scanId: SCAN_ID, targetType: 'generated_preview', previewId: PREVIEW_ID });

    expect(mockLaunchBrowser).not.toHaveBeenCalled();
  });
});

describe('handler — partial and full failure', () => {
  it('one viewport fails, one succeeds → partial, per-viewport detail preserved', async () => {
    mockGetItem.mockResolvedValueOnce(scanEvent({ status: 'queued' })).mockResolvedValueOnce({ websiteUrl: 'https://acme.com' });
    mockCaptureViewport
      .mockResolvedValueOnce(FAKE_PNG) // desktop succeeds
      .mockRejectedValueOnce(new MockScreenshotCaptureError('Navigation timed out', 'navigation_timeout')); // mobile fails

    await handler({ businessId: BUSINESS_ID, scanId: SCAN_ID, targetType: 'existing_site' });

    const finalCall = mockConditionalUpdateStatus.mock.calls.at(-1)![0];
    expect(finalCall.updates.status).toBe('partial');
    expect(finalCall.updates.captureResults.desktop.status).toBe('completed');
    expect(finalCall.updates.captureResults.mobile).toEqual({
      status: 'failed',
      failureCategory: 'navigation_timeout',
      failureMessage: 'Navigation timed out',
    });
    // Partial results carry no top-level failure summary — detail lives in captureResults only.
    expect(finalCall.updates.failureCategory).toBeUndefined();
  });

  it('both viewports fail → failed, one conditionalUpdateStatus call with a summary category', async () => {
    mockGetItem.mockResolvedValueOnce(scanEvent({ status: 'queued' })).mockResolvedValueOnce({ websiteUrl: 'https://acme.com' });
    mockCaptureViewport.mockRejectedValue(new MockScreenshotCaptureError('Blocked', 'blocked_by_bot_protection'));

    await handler({ businessId: BUSINESS_ID, scanId: SCAN_ID, targetType: 'existing_site' });

    const finalCall = mockConditionalUpdateStatus.mock.calls.at(-1)![0];
    expect(finalCall.updates.status).toBe('failed');
    expect(finalCall.updates.failureCategory).toBe('blocked_by_bot_protection');
  });

  it('browser fails to launch → both viewports marked failed in ONE conditional update, capture never attempted', async () => {
    mockGetItem.mockResolvedValueOnce(scanEvent({ status: 'queued' })).mockResolvedValueOnce({ websiteUrl: 'https://acme.com' });
    mockLaunchBrowser.mockRejectedValue(new MockScreenshotCaptureError('No Chromium', 'browser_launch_failed'));

    await handler({ businessId: BUSINESS_ID, scanId: SCAN_ID, targetType: 'existing_site' });

    expect(mockCaptureViewport).not.toHaveBeenCalled();
    // Exactly two conditionalUpdateStatus calls total: queued→running, then the launch-failure terminal write.
    expect(mockConditionalUpdateStatus).toHaveBeenCalledTimes(2);
    const finalCall = mockConditionalUpdateStatus.mock.calls.at(-1)![0];
    expect(finalCall.updates.status).toBe('failed');
    expect(finalCall.updates.failureCategory).toBe('browser_launch_failed');
    expect(finalCall.updates.captureResults.desktop.status).toBe('failed');
    expect(finalCall.updates.captureResults.mobile.status).toBe('failed');
  });

  it('upload failure is distinct from capture failure (upload_failed, not screenshot_failed)', async () => {
    mockGetItem.mockResolvedValueOnce(scanEvent({ status: 'queued' })).mockResolvedValueOnce({ websiteUrl: 'https://acme.com' });
    mockPutScreenshot.mockRejectedValue(new Error('S3 access denied'));

    await handler({ businessId: BUSINESS_ID, scanId: SCAN_ID, targetType: 'existing_site' });

    const finalCall = mockConditionalUpdateStatus.mock.calls.at(-1)![0];
    expect(finalCall.updates.status).toBe('failed');
    expect(finalCall.updates.captureResults.desktop.failureCategory).toBe('upload_failed');
    expect(finalCall.updates.captureResults.mobile.failureCategory).toBe('upload_failed');
  });
});
