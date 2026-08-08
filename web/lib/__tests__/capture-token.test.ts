/**
 * Unit tests for the preview capture-token verifier. The Secrets Manager
 * wrapper is mocked — no real AWS call. Tokens are constructed directly with
 * `jose` (mirroring what the screenshot Lambda's own minting code does) so
 * this test exercises the verification contract without depending on the
 * Lambda package at all.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignJWT } from 'jose';

const mockGetCaptureTokenSecret = vi.hoisted(() => vi.fn());

vi.mock('@/lib/secrets', () => ({
  getCaptureTokenSecret: mockGetCaptureTokenSecret,
}));

vi.mock('server-only', () => ({}));

import { verifyCaptureToken, verifyPostcardRenderToken } from '../capture-token';

const SIGNING_KEY = 'test-signing-key-at-least-32-bytes-long!!';
const PREVIEW_ID = 'preview_00000000-0000-0000-0000-000000000001';
const SCAN_ID = 'scan_00000000-0000-0000-0000-000000000002';
const POSTCARD_ID = 'postcard_00000000-0000-0000-0000-000000000003';

async function signToken(claims: Record<string, unknown>, expiresIn = '5m'): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(SIGNING_KEY));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCaptureTokenSecret.mockResolvedValue({ signingKey: SIGNING_KEY });
});

describe('verifyCaptureToken', () => {
  it('accepts a validly-signed token for the matching preview and returns its claims', async () => {
    const token = await signToken({ purpose: 'preview_capture', previewId: PREVIEW_ID, scanId: SCAN_ID });
    const claims = await verifyCaptureToken(token, { previewId: PREVIEW_ID });
    expect(claims).toEqual({ purpose: 'preview_capture', previewId: PREVIEW_ID, scanId: SCAN_ID });
  });

  it('rejects when no token is supplied', async () => {
    expect(await verifyCaptureToken(undefined, { previewId: PREVIEW_ID })).toBeNull();
  });

  it('rejects a validly-signed token for a different preview', async () => {
    const token = await signToken({ purpose: 'preview_capture', previewId: 'preview_other', scanId: SCAN_ID });
    expect(await verifyCaptureToken(token, { previewId: PREVIEW_ID })).toBeNull();
  });

  it('rejects a token with the wrong purpose', async () => {
    const token = await signToken({ purpose: 'not_capture', previewId: PREVIEW_ID, scanId: SCAN_ID });
    expect(await verifyCaptureToken(token, { previewId: PREVIEW_ID })).toBeNull();
  });

  it('rejects a token missing scanId', async () => {
    const token = await signToken({ purpose: 'preview_capture', previewId: PREVIEW_ID });
    expect(await verifyCaptureToken(token, { previewId: PREVIEW_ID })).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await signToken({ purpose: 'preview_capture', previewId: PREVIEW_ID, scanId: SCAN_ID }, '-1s');
    expect(await verifyCaptureToken(token, { previewId: PREVIEW_ID })).toBeNull();
  });

  it('rejects a token signed with the wrong key', async () => {
    const token = await new SignJWT({ purpose: 'preview_capture', previewId: PREVIEW_ID, scanId: SCAN_ID })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode('a-completely-different-key-value!!!'));
    expect(await verifyCaptureToken(token, { previewId: PREVIEW_ID })).toBeNull();
  });

  it('rejects a malformed token string', async () => {
    expect(await verifyCaptureToken('not-a-jwt', { previewId: PREVIEW_ID })).toBeNull();
  });
});

describe('verifyPostcardRenderToken', () => {
  it('accepts a validly-signed token for the matching postcard and returns its claims', async () => {
    const token = await signToken({ purpose: 'postcard_render', postcardId: POSTCARD_ID });
    const claims = await verifyPostcardRenderToken(token, { postcardId: POSTCARD_ID });
    expect(claims).toEqual({ purpose: 'postcard_render', postcardId: POSTCARD_ID });
  });

  it('rejects when no token is supplied', async () => {
    expect(await verifyPostcardRenderToken(undefined, { postcardId: POSTCARD_ID })).toBeNull();
  });

  it('rejects a validly-signed token for a different postcard', async () => {
    const token = await signToken({ purpose: 'postcard_render', postcardId: 'postcard_other' });
    expect(await verifyPostcardRenderToken(token, { postcardId: POSTCARD_ID })).toBeNull();
  });

  it('rejects a token with the wrong purpose (e.g. a preview_capture token reused here)', async () => {
    const token = await signToken({ purpose: 'preview_capture', previewId: PREVIEW_ID, scanId: SCAN_ID });
    expect(await verifyPostcardRenderToken(token, { postcardId: POSTCARD_ID })).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await signToken({ purpose: 'postcard_render', postcardId: POSTCARD_ID }, '-1s');
    expect(await verifyPostcardRenderToken(token, { postcardId: POSTCARD_ID })).toBeNull();
  });

  it('rejects a token signed with the wrong key', async () => {
    const token = await new SignJWT({ purpose: 'postcard_render', postcardId: POSTCARD_ID })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode('a-completely-different-key-value!!!'));
    expect(await verifyPostcardRenderToken(token, { postcardId: POSTCARD_ID })).toBeNull();
  });

  it('rejects a malformed token string', async () => {
    expect(await verifyPostcardRenderToken('not-a-jwt', { postcardId: POSTCARD_ID })).toBeNull();
  });
});
