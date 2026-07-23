import { describe, it, expect } from 'vitest';
import { CAPTURE_TOKEN_COOKIE_NAME } from '../capture-token';

/**
 * `mintCaptureToken` itself is deliberately NOT exercised end-to-end here.
 * It loads `jose` via `new Function('return import("jose")')` — the only
 * way to stop `tsc` downleveling a plain `await import('jose')` back into a
 * `require()` that fails at runtime against jose's ESM-only build (see
 * `capture-token.ts`'s doc comment). That same indirection breaks under
 * Vitest/Vite's SSR execution context (`TypeError: A dynamic import
 * callback was not specified`) even though it works correctly when the
 * compiled output actually runs under plain Node — confirmed by building
 * and running the real Docker image locally (`docker build` +
 * `docker run --entrypoint node ... mintCaptureToken(...)`, see
 * build_log.md, "Stage 14"), which is the environment that matters, since
 * that's exactly how the deployed Lambda executes this code.
 */
describe('capture-token module', () => {
  it('exports the cookie name used to deliver the token (must match web/lib/capture-token.ts)', () => {
    expect(CAPTURE_TOKEN_COOKIE_NAME).toBe('__Host-webpresa_capture');
  });
});
