/**
 * Minting side of the Stage 22 `postcard_render` capture token — the
 * counterpart to `web/lib/capture-token.ts`'s verification-only module,
 * following the exact same split established by Stage 14's
 * `preview_capture` purpose (see that module's doc comment for the full
 * "why mint here, not in the caller" rationale — it's identical here: this
 * Lambda mints immediately before navigating, so no other part of the app
 * ever needs to hold a signing key). Claim shape, cookie name, and signing
 * algorithm must stay in sync with `web/lib/capture-token.ts`.
 *
 * The `new Function('return import(...)')` indirection below exists for
 * the exact same `jose` v6 ESM-only / `tsc`-downleveling reason documented
 * in `infra/lambda/screenshot-capture/src/capture-token.ts` — see that
 * file's doc comment for the full explanation; not repeated here since the
 * mechanism is identical, only the claims shape differs.
 */

export const CAPTURE_TOKEN_COOKIE_NAME = '__Host-webpresa_capture';
const TOKEN_TTL = '5m';

// eslint-disable-next-line @typescript-eslint/no-implied-eval -- deliberate: see doc comment above.
const importJose = new Function('return import("jose")') as () => Promise<typeof import('jose')>;

export async function mintCaptureToken(params: {
  postcardId: string;
  signingKey: string;
}): Promise<string> {
  const { SignJWT } = await importJose();
  return new SignJWT({ purpose: 'postcard_render', postcardId: params.postcardId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(new TextEncoder().encode(params.signingKey));
}
