/**
 * Unit tests for POST /api/build/upload — the per-file upload route that
 * lets `/build`'s photo/logo step stay under Vercel's serverless function
 * request-body ceiling by uploading one file at a time, well before the
 * final "Build My Website" submit.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockUploadBusinessAsset, mockCheckRateLimit, mockHeadersGet } = vi.hoisted(() => ({
  mockUploadBusinessAsset: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockHeadersGet: vi.fn(),
}));

vi.mock('@/lib/s3/business-assets', () => ({ uploadBusinessAsset: mockUploadBusinessAsset }));
vi.mock('@/lib/s3/upload-validation', async () => {
  const actual = await vi.importActual<typeof import('@/lib/s3/upload-validation')>('@/lib/s3/upload-validation');
  return actual;
});
vi.mock('@/lib/db/claims', () => ({
  buildSelfServiceBuildRateLimitKey: (scope: string, windowBucket: string) => `RATELIMIT#${scope}#${windowBucket}`,
  checkAndIncrementSelfServiceBuildRateLimit: mockCheckRateLimit,
}));
vi.mock('next/headers', () => ({ headers: async () => ({ get: mockHeadersGet }) }));

import { POST } from '../route';
import { UploadValidationError } from '@/lib/s3/upload-validation';

const DRAFT_ID = '11111111-2222-3333-4444-555555555555';

function makeRequest(fields: Record<string, string | File>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return new Request('http://localhost/api/build/upload', { method: 'POST', body: formData });
}

function makeFile(name = 'photo.png') {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue(true);
  mockHeadersGet.mockReturnValue(null);
});

describe('POST /api/build/upload', () => {
  it('uploads a valid file and returns its URL', async () => {
    mockUploadBusinessAsset.mockResolvedValueOnce('/api/assets/businesses/draft-x/assets/logo.png');

    const res = await POST(makeRequest({ file: makeFile(), draftId: DRAFT_ID, kind: 'logo' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ url: '/api/assets/businesses/draft-x/assets/logo.png' });
    expect(mockUploadBusinessAsset).toHaveBeenCalledWith(DRAFT_ID, expect.any(File), 'logo');
  });

  it('scopes photo uploads under a randomized photos/ key prefix, not a fixed name', async () => {
    mockUploadBusinessAsset.mockResolvedValueOnce('/api/assets/businesses/draft-x/assets/photos/abc.png');

    await POST(makeRequest({ file: makeFile(), draftId: DRAFT_ID, kind: 'photo' }));

    const [, , keyPrefix] = mockUploadBusinessAsset.mock.calls[0];
    expect(keyPrefix).toMatch(/^photos\//);
  });

  it('rejects a missing file', async () => {
    const res = await POST(makeRequest({ draftId: DRAFT_ID, kind: 'logo' }));
    expect(res.status).toBe(400);
    expect(mockUploadBusinessAsset).not.toHaveBeenCalled();
  });

  it('rejects a malformed draftId', async () => {
    const res = await POST(makeRequest({ file: makeFile(), draftId: 'not-a-uuid', kind: 'logo' }));
    expect(res.status).toBe(400);
    expect(mockUploadBusinessAsset).not.toHaveBeenCalled();
  });

  it('rejects an invalid kind', async () => {
    const res = await POST(makeRequest({ file: makeFile(), draftId: DRAFT_ID, kind: 'banner' }));
    expect(res.status).toBe(400);
    expect(mockUploadBusinessAsset).not.toHaveBeenCalled();
  });

  it('surfaces an UploadValidationError message with a 400, not a 500', async () => {
    mockUploadBusinessAsset.mockRejectedValueOnce(new UploadValidationError('Unsupported file type — only JPEG, PNG, and WebP images are allowed.'));

    const res = await POST(makeRequest({ file: makeFile('logo.svg'), draftId: DRAFT_ID, kind: 'logo' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('JPEG, PNG, and WebP');
  });

  it('rate-limits by IP before ever touching S3', async () => {
    mockCheckRateLimit.mockResolvedValueOnce(false);

    const res = await POST(makeRequest({ file: makeFile(), draftId: DRAFT_ID, kind: 'logo' }));

    expect(res.status).toBe(429);
    expect(mockUploadBusinessAsset).not.toHaveBeenCalled();
  });
});
