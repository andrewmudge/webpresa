/**
 * Minting side of the Stage 14 preview capture token — the counterpart to
 * `web/lib/capture-token.ts`'s verification-only module (see its doc
 * comment for the full "why mint here, not in the Server Action" rationale
 * — implementation.md, Stage 14, "Draft preview visibility"). Claim shape,
 * cookie name, and signing algorithm must stay in sync with that module.
 *
 * `jose` ships ESM-only (no CommonJS build) as of v6, but this package
 * compiles to CommonJS (`tsc`'s default, and what `aws-lambda-ric` expects
 * as its handler module) — a plain `import`/`require('jose')` fails at
 * runtime with `ERR_REQUIRE_ESM` (caught by actually running the built
 * Docker image locally, not by `tsc --noEmit`, which doesn't check module
 * runtime compatibility). A *dynamic* `import()` is valid from CommonJS —
 * except `tsc` itself downlevels a plain `await import('jose')` back into
 * `require('jose')` when targeting `module: commonjs` (confirmed by
 * inspecting `dist/capture-token.js` — it still failed identically). The
 * `new Function(...)` indirection below is the standard, widely-used
 * workaround: it hides the `import()` expression from TypeScript's static
 * transform entirely, so Node executes a genuine ESM dynamic import at
 * runtime.
 */

export const CAPTURE_TOKEN_COOKIE_NAME = '__Host-webpresa_capture';
const TOKEN_TTL = '5m';

// eslint-disable-next-line @typescript-eslint/no-implied-eval -- deliberate: the only way to stop tsc from downleveling this to require() (see doc comment above).
const importJose = new Function('return import("jose")') as () => Promise<typeof import('jose')>;

export async function mintCaptureToken(params: {
  previewId: string;
  scanId: string;
  signingKey: string;
}): Promise<string> {
  const { SignJWT } = await importJose();
  return new SignJWT({ purpose: 'preview_capture', previewId: params.previewId, scanId: params.scanId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(new TextEncoder().encode(params.signingKey));
}
