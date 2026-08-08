import 'server-only';
import { jwtVerify } from 'jose';
import { getCaptureTokenSecret } from '@/lib/secrets';

/**
 * Verification side of the Stage 14 (Playwright) preview capture token.
 *
 * The token is **minted only by the screenshot Lambda** (a separate
 * deployable — see `infra/lambda/screenshot-capture/src/capture-token.ts`),
 * immediately before it navigates to a `generated_preview` target, so it can
 * render an unpublished draft `SitePreview` without an admin session. This
 * module is verification-only, deliberately — see `implementation.md`,
 * Stage 14, "Draft preview visibility" for why the Server Action that
 * invokes the Lambda never mints one itself.
 *
 * The token is delivered as an HTTP-only cookie (`CAPTURE_TOKEN_COOKIE_NAME`)
 * set by Playwright before navigation, never a URL query parameter — see the
 * same section for why.
 */

export const CAPTURE_TOKEN_COOKIE_NAME = '__Host-webpresa_capture';

export interface CaptureTokenClaims {
  purpose: 'preview_capture';
  previewId: string;
  scanId: string;
}

/**
 * Stage 22 Phase 2's capture token — same cookie, same signing key, same
 * mint-then-verify split as `CaptureTokenClaims` above, but minted by the
 * postcard-render Lambda (`infra/lambda/postcard-render/src/capture-token.ts`)
 * immediately before it navigates to
 * `/internal/postcards/[postcardId]/render/[side]`, so that page can render
 * without an admin session. Kept as a separate type/function rather than
 * folded into `verifyCaptureToken` — the two purposes check different
 * claims against different callers and have no shared validation logic
 * worth forcing into one signature.
 */
export interface PostcardRenderTokenClaims {
  purpose: 'postcard_render';
  postcardId: string;
}

function getSigningKey(signingKey: string): Uint8Array {
  return new TextEncoder().encode(signingKey);
}

/**
 * Verifies a capture-token cookie value against the specific preview being
 * rendered. Every claim is checked, not just the signature — a
 * validly-signed token for the wrong preview must still be rejected (see
 * the class doc above). Returns the verified claims (so the caller can
 * additionally confirm `scanId` matches an actual in-flight ScanEvent —
 * see `app/b/[slug]/page.tsx` — which this module deliberately does not do
 * itself, since it has no DB access of its own) or `null` on any failure.
 */
export async function verifyCaptureToken(
  token: string | undefined,
  expected: { previewId: string },
): Promise<CaptureTokenClaims | null> {
  if (!token) return null;

  const { signingKey } = await getCaptureTokenSecret();
  try {
    const { payload } = await jwtVerify(token, getSigningKey(signingKey), {
      algorithms: ['HS256'],
    });
    const claims = payload as unknown as Partial<CaptureTokenClaims>;
    if (claims.purpose !== 'preview_capture' || claims.previewId !== expected.previewId || !claims.scanId) {
      return null;
    }
    return { purpose: 'preview_capture', previewId: claims.previewId, scanId: claims.scanId };
  } catch {
    // Expired, malformed, or wrong signature — all fail closed.
    return null;
  }
}

/** Same verification contract as `verifyCaptureToken`, checked against a `postcardId` instead of a `previewId` — see `PostcardRenderTokenClaims`'s doc comment. */
export async function verifyPostcardRenderToken(
  token: string | undefined,
  expected: { postcardId: string },
): Promise<PostcardRenderTokenClaims | null> {
  if (!token) return null;

  const { signingKey } = await getCaptureTokenSecret();
  try {
    const { payload } = await jwtVerify(token, getSigningKey(signingKey), {
      algorithms: ['HS256'],
    });
    const claims = payload as unknown as Partial<PostcardRenderTokenClaims>;
    if (claims.purpose !== 'postcard_render' || claims.postcardId !== expected.postcardId) {
      return null;
    }
    return { purpose: 'postcard_render', postcardId: claims.postcardId };
  } catch {
    return null;
  }
}
