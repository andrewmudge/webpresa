/**
 * Unit tests for the S3 assets helper module.
 * All S3 interactions are mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the S3 client module and presigner before importing the module under test
// ---------------------------------------------------------------------------

const mockSend = vi.fn();
const mockGetSignedUrl = vi.fn();

vi.mock('@/lib/s3/client', () => ({
  getS3Client: () => ({ send: mockSend }),
  getAssetsBucketName: () => 'webpresa-test-assets',
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

// Mock server-only to a no-op (it's a build-time guard, irrelevant in tests)
vi.mock('server-only', () => ({}));

// ---------------------------------------------------------------------------
// Imports (after mocks are set up)
// ---------------------------------------------------------------------------

import { putAsset, getAsset, getSignedAssetUrl } from '@/lib/s3/assets';
import { NoSuchKey } from '@aws-sdk/client-s3';

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// putAsset
// ---------------------------------------------------------------------------

describe('putAsset', () => {
  it('calls PutObjectCommand with the correct bucket, key, and body', async () => {
    mockSend.mockResolvedValueOnce({});
    const body = Buffer.from('hello');

    await putAsset('scans/biz_1/scan_1/crawl.json', body, 'application/json');

    expect(mockSend).toHaveBeenCalledOnce();
    const arg = mockSend.mock.calls[0][0].input;
    expect(arg.Bucket).toBe('webpresa-test-assets');
    expect(arg.Key).toBe('scans/biz_1/scan_1/crawl.json');
    expect(arg.Body).toBe(body);
    expect(arg.ContentType).toBe('application/json');
  });

  it('rejects a key outside the allowed prefixes without calling S3', async () => {
    await expect(
      putAsset('other/biz_1/file.json', Buffer.from('x'), 'application/json'),
    ).rejects.toThrow(/Invalid asset key/);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('accepts a key under the businesses/ prefix', async () => {
    mockSend.mockResolvedValueOnce({});
    await putAsset('businesses/biz_1/assets/logo.png', Buffer.from('x'), 'image/png');
    expect(mockSend).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// getAsset
// ---------------------------------------------------------------------------

describe('getAsset', () => {
  it('returns a Buffer when the object exists', async () => {
    const bytes = new Uint8Array(Buffer.from('hello'));
    mockSend.mockResolvedValueOnce({
      Body: { transformToByteArray: async () => bytes },
    });

    const result = await getAsset('previews/biz_1/preview_1/hero.jpg');

    expect(result).toBeInstanceOf(Buffer);
    expect(result?.toString()).toBe('hello');
  });

  it('returns null when the object does not exist', async () => {
    mockSend.mockRejectedValueOnce(
      new NoSuchKey({ message: 'not found', $metadata: {} }),
    );

    const result = await getAsset('previews/biz_1/preview_1/missing.jpg');

    expect(result).toBeNull();
  });

  it('rejects a key outside the allowed prefixes without calling S3', async () => {
    await expect(getAsset('other/biz_1/file.json')).rejects.toThrow(
      /Invalid asset key/,
    );
    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getSignedAssetUrl
// ---------------------------------------------------------------------------

describe('getSignedAssetUrl', () => {
  it('requests a signed URL with the given expiry', async () => {
    mockGetSignedUrl.mockResolvedValueOnce('https://signed.example/url');

    const url = await getSignedAssetUrl('postcards/biz_1/postcard_1/front.pdf', 120);

    expect(url).toBe('https://signed.example/url');
    expect(mockGetSignedUrl).toHaveBeenCalledOnce();
    const [, , options] = mockGetSignedUrl.mock.calls[0];
    expect(options).toEqual({ expiresIn: 120 });
  });

  it('defaults to a 300-second expiry', async () => {
    mockGetSignedUrl.mockResolvedValueOnce('https://signed.example/url');

    await getSignedAssetUrl('postcards/biz_1/postcard_1/front.pdf');

    const [, , options] = mockGetSignedUrl.mock.calls[0];
    expect(options).toEqual({ expiresIn: 300 });
  });

  it('rejects a key outside the allowed prefixes without calling the presigner', async () => {
    await expect(getSignedAssetUrl('other/biz_1/file.json')).rejects.toThrow(
      /Invalid asset key/,
    );
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });
});
