import { describe, it, expect } from 'vitest';
import { CAPTURE_TOKEN_COOKIE_NAME } from '../capture-token';

/**
 * `mintCaptureToken` itself is deliberately NOT exercised end-to-end here —
 * see infra/lambda/screenshot-capture/src/__tests__/capture-token.test.ts's
 * doc comment for the full "why" (the `new Function('return import(...))')`
 * indirection breaks under Vitest/Vite's SSR execution context even though
 * it works correctly under plain Node, which is what the deployed Lambda
 * actually runs as).
 */
describe('capture-token module', () => {
  it('exports the cookie name used to deliver the token (must match web/lib/capture-token.ts)', () => {
    expect(CAPTURE_TOKEN_COOKIE_NAME).toBe('__Host-webpresa_capture');
  });
});
