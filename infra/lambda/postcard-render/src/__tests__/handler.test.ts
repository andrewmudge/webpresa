/**
 * Unit tests for the Lambda entrypoint. Everything AWS/Playwright-touching
 * is mocked, mirroring screenshot-capture/src/__tests__/handler.test.ts's
 * approach — this only exercises the orchestration in handler.ts itself.
 * Unlike that Lambda, there is no DynamoDB idempotency state machine to
 * test here: this handler is a straight-line launch → render → upload →
 * return, invoked synchronously, so there's no queued/running/terminal
 * status logic at all.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPutPdf = vi.hoisted(() => vi.fn());
const mockGetSecretJson = vi.hoisted(() => vi.fn());
const mockMintCaptureToken = vi.hoisted(() => vi.fn());
const mockLaunchBrowser = vi.hoisted(() => vi.fn());
const mockCapturePdf = vi.hoisted(() => vi.fn());

vi.mock('../aws', () => ({
  putPdf: mockPutPdf,
  getSecretJson: mockGetSecretJson,
}));
vi.mock('../capture-token', () => ({ mintCaptureToken: mockMintCaptureToken, CAPTURE_TOKEN_COOKIE_NAME: '__Host-webpresa_capture' }));

// Hand-defined stand-in, not `importOriginal` — avoids pulling the real
// `playwright-core` import chain into a test that never needs it, mirroring
// screenshot-capture's identical rationale for MockScreenshotCaptureError.
const MockPostcardRenderError = vi.hoisted(
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
  capturePdf: mockCapturePdf,
  PostcardRenderError: MockPostcardRenderError,
}));

import { handler } from '../handler';

const POSTCARD_ID = 'postcard_1';
const BUSINESS_ID = 'biz_1';

function baseEnv() {
  process.env.ASSETS_BUCKET_NAME = 'assets';
  process.env.CAPTURE_TOKEN_SECRET_NAME = 'capture-token';
  process.env.VERCEL_PROTECTION_BYPASS_SECRET_NAME = 'vercel-protection-bypass';
  process.env.WEBPRESA_APP_BASE_URL = 'https://app.example.com';
}

const FAKE_PDF = Buffer.from('fake-pdf-bytes');

beforeEach(() => {
  vi.clearAllMocks();
  baseEnv();
  mockGetSecretJson.mockResolvedValue({ signingKey: 'test-key', bypassSecret: 'test-bypass' });
  mockMintCaptureToken.mockResolvedValue('signed.jwt.token');
  mockLaunchBrowser.mockResolvedValue({ close: vi.fn().mockResolvedValue(undefined) });
  mockCapturePdf.mockResolvedValue(FAKE_PDF);
  mockPutPdf.mockResolvedValue(undefined);
});

describe('handler — happy path', () => {
  it('mints a capture token, renders the correct internal URL, and returns the S3 storage key', async () => {
    const result = await handler({ postcardId: POSTCARD_ID, businessId: BUSINESS_ID, side: 'front' });

    expect(mockMintCaptureToken).toHaveBeenCalledWith({ postcardId: POSTCARD_ID, signingKey: 'test-key' });
    expect(mockCapturePdf).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://app.example.com/internal/postcards/postcard_1/render/front',
        captureToken: { cookieDomain: 'app.example.com', token: 'signed.jwt.token' },
        vercelBypassSecret: 'test-bypass',
      }),
    );
    expect(mockPutPdf).toHaveBeenCalledWith('assets', `postcards/${BUSINESS_ID}/${POSTCARD_ID}/front.pdf`, FAKE_PDF);
    expect(result).toEqual({ storageKey: `postcards/${BUSINESS_ID}/${POSTCARD_ID}/front.pdf` });
  });

  it('renders the back side to a distinct storage key', async () => {
    const result = await handler({ postcardId: POSTCARD_ID, businessId: BUSINESS_ID, side: 'back' });

    expect(mockCapturePdf).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://app.example.com/internal/postcards/postcard_1/render/back' }),
    );
    expect(result).toEqual({ storageKey: `postcards/${BUSINESS_ID}/${POSTCARD_ID}/back.pdf` });
  });

  it('always closes the browser, even on success', async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    mockLaunchBrowser.mockResolvedValue({ close });

    await handler({ postcardId: POSTCARD_ID, businessId: BUSINESS_ID, side: 'front' });

    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe('handler — failure propagation', () => {
  it('a PostcardRenderError from capturePdf propagates to the caller as-is', async () => {
    mockCapturePdf.mockRejectedValue(new MockPostcardRenderError('Navigation timed out', 'navigation_timeout'));

    await expect(handler({ postcardId: POSTCARD_ID, businessId: BUSINESS_ID, side: 'front' })).rejects.toMatchObject({
      message: 'Navigation timed out',
      category: 'navigation_timeout',
    });
    expect(mockPutPdf).not.toHaveBeenCalled();
  });

  it('a browser launch failure never attempts the S3 upload', async () => {
    mockLaunchBrowser.mockRejectedValue(new MockPostcardRenderError('No Chromium', 'browser_launch_failed'));

    await expect(handler({ postcardId: POSTCARD_ID, businessId: BUSINESS_ID, side: 'front' })).rejects.toThrow('No Chromium');
    expect(mockCapturePdf).not.toHaveBeenCalled();
    expect(mockPutPdf).not.toHaveBeenCalled();
  });

  it('an upload failure propagates as a plain Error, still closes the browser', async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    mockLaunchBrowser.mockResolvedValue({ close });
    mockPutPdf.mockRejectedValue(new Error('S3 access denied'));

    await expect(handler({ postcardId: POSTCARD_ID, businessId: BUSINESS_ID, side: 'front' })).rejects.toThrow('S3 access denied');
    expect(close).toHaveBeenCalledTimes(1);
  });
});
