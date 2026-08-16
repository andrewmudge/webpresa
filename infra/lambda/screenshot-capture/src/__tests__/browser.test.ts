/**
 * Unit tests for the Stage 25 (Security Hardening) per-redirect navigation
 * guard — `guardNavigationRequests`. Does not launch a real browser; a
 * minimal fake `BrowserContext` captures the route handler Playwright would
 * otherwise register, so the handler's own logic can be exercised directly.
 */
import { describe, it, expect, vi } from 'vitest';
import type { BrowserContext } from 'playwright-core';
import { guardNavigationRequests } from '../browser';

type RouteHandler = (route: FakeRoute) => Promise<void>;

interface FakeRequest {
  url: string;
  isNav: boolean;
}

class FakeRoute {
  continued = false;
  aborted: string | undefined;
  constructor(private readonly req: FakeRequest) {}
  request() {
    return { url: () => this.req.url, isNavigationRequest: () => this.req.isNav };
  }
  async continue() {
    this.continued = true;
  }
  async abort(reason: string) {
    this.aborted = reason;
  }
}

async function captureRouteHandler(sameOriginBase?: string): Promise<RouteHandler> {
  let handler: RouteHandler | undefined;
  const fakeContext = {
    route: async (_pattern: string, fn: RouteHandler) => {
      handler = fn;
    },
  } as unknown as BrowserContext;

  await guardNavigationRequests(fakeContext, sameOriginBase);
  if (!handler) throw new Error('route handler was never registered');
  return handler;
}

describe('guardNavigationRequests — general SSRF blocklist mode (existing_site, no sameOriginBase)', () => {
  it('continues a public navigation request', async () => {
    const handler = await captureRouteHandler(undefined);
    const route = new FakeRoute({ url: 'https://example.com/', isNav: true });
    await handler(route);
    expect(route.continued).toBe(true);
    expect(route.aborted).toBeUndefined();
  });

  it('aborts a navigation request (e.g. a redirect hop) that resolves to a private address', async () => {
    const handler = await captureRouteHandler(undefined);
    const route = new FakeRoute({ url: 'http://127.0.0.1/admin', isNav: true });
    await handler(route);
    expect(route.aborted).toBe('blockedbyclient');
    expect(route.continued).toBe(false);
  });

  it('aborts a navigation request that resolves to the AWS metadata endpoint', async () => {
    const handler = await captureRouteHandler(undefined);
    const route = new FakeRoute({ url: 'http://169.254.169.254/latest/meta-data/', isNav: true });
    await handler(route);
    expect(route.aborted).toBe('blockedbyclient');
  });

  it('never checks (always continues) a non-navigation subresource request, even to a private address', async () => {
    const handler = await captureRouteHandler(undefined);
    const route = new FakeRoute({ url: 'http://127.0.0.1/tracking.png', isNav: false });
    await handler(route);
    expect(route.continued).toBe(true);
    expect(route.aborted).toBeUndefined();
  });
});

describe('guardNavigationRequests — strict same-origin mode (generated_preview, sameOriginBase set)', () => {
  const base = 'https://app.webpresa.com';

  it('continues a navigation request on the exact configured origin', async () => {
    const handler = await captureRouteHandler(base);
    const route = new FakeRoute({ url: 'https://app.webpresa.com/b/acme-plumbing', isNav: true });
    await handler(route);
    expect(route.continued).toBe(true);
  });

  it('aborts a redirect off the configured origin, even to a public, non-private address', async () => {
    const handler = await captureRouteHandler(base);
    const route = new FakeRoute({ url: 'https://evil.example.com/', isNav: true });
    await handler(route);
    expect(route.aborted).toBe('blockedbyclient');
  });

  it('aborts a scheme mismatch on the same host', async () => {
    const handler = await captureRouteHandler(base);
    const route = new FakeRoute({ url: 'http://app.webpresa.com/b/acme', isNav: true });
    await handler(route);
    expect(route.aborted).toBe('blockedbyclient');
  });
});
