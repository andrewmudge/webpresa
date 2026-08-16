import { chromium, type Browser, type BrowserContext } from 'playwright-core';
import { CAPTURE_TOKEN_COOKIE_NAME } from './capture-token';
import { validateOutboundUrl } from './url-validation';
import { isWithinConfiguredOrigin } from './same-origin';

/**
 * Viewport capture — see implementation.md, Stage 14, "Operational
 * parameters" for the exact wait strategy and its rationale (a
 * `domcontentloaded`-first sequence, not `networkidle`-primary, since
 * `networkidle` is unreliable on real-world sites with persistent
 * analytics/chat-widget/polling connections).
 */

export const VIEWPORTS = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 390, height: 844 },
} as const;
export type ViewportName = keyof typeof VIEWPORTS;

const NAVIGATION_TIMEOUT_MS = 30_000;
const FONTS_READY_TIMEOUT_MS = 5_000;
const STABILIZATION_DELAY_MS = 1_500;
const NETWORK_IDLE_BEST_EFFORT_MS = 3_000;
/** Sanity backstop — fullPage:false + fixed viewports already bound this in practice. */
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;

const DISABLE_ANIMATIONS_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
`;

export class ScreenshotCaptureError extends Error {
  constructor(
    message: string,
    public readonly category:
      | 'browser_launch_failed'
      | 'navigation_timeout'
      | 'page_load_failed'
      | 'blocked_by_bot_protection'
      | 'blocked_url'
      | 'screenshot_failed',
  ) {
    super(message);
  }
}

/**
 * Stage 25 (Security Hardening) — re-validates every *navigation* request
 * (the initial URL, plus every server-side redirect hop Playwright follows
 * internally within one `page.goto()` call) rather than trusting the
 * one-time check `handler.ts` runs before `page.goto()` is ever called.
 * Without this, a URL that passes that one-time check and then redirects —
 * at request time — to a blocked destination would reach it unchecked,
 * since Playwright follows redirects on its own with no re-validation by
 * default. Each hop in a redirect chain is dispatched as its own request
 * through this same route handler, so this covers the whole chain, not
 * just the first hop.
 *
 * Two modes, matching the two capture targets' genuinely different trust
 * models (see `same-origin.ts`'s doc comment):
 * - `sameOriginBase` set (`generated_preview`) → `isWithinConfiguredOrigin`:
 *   strict same-origin only, since this destination is never actually
 *   untrusted — it's always Webpresa's own app, so *any* redirect off that
 *   exact origin is refused, private-IP or not. This is the check
 *   `same-origin.ts`'s own doc comment always claimed happened here; it
 *   didn't, until now.
 * - `sameOriginBase` unset (`existing_site`) → `validateOutboundUrl()`: the
 *   general SSRF blocklist, mirroring the per-redirect re-validation
 *   `web/lib/firecrawl/images.ts` already does for image fetches on the
 *   Next.js side.
 *
 * Deliberately scoped to navigation requests only (`request.isNavigationRequest()`)
 * — subresource requests a loaded page makes (images, scripts, XHR) are not
 * re-validated here, keeping this targeted at the actual SSRF surface
 * (where the page/frame itself ends up) rather than adding a DNS lookup to
 * every request a real-world page happens to make.
 */
export async function guardNavigationRequests(context: BrowserContext, sameOriginBase?: string): Promise<void> {
  await context.route('**/*', async (route) => {
    const request = route.request();
    if (!request.isNavigationRequest()) {
      await route.continue();
      return;
    }

    const allowed = sameOriginBase
      ? isWithinConfiguredOrigin(sameOriginBase, request.url())
      : (await validateOutboundUrl(request.url())).ok;

    if (!allowed) {
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
}

export async function launchBrowser(): Promise<Browser> {
  try {
    // Resolves the browser via PLAYWRIGHT_BROWSERS_PATH, set in the
    // Dockerfile to match the Microsoft Playwright base image's install
    // location — see Dockerfile for the full rationale. --no-sandbox and
    // --disable-dev-shm-usage are the standard, well-documented flags for
    // running Chromium inside a container with a small /dev/shm.
    // --single-process/--no-zygote confirmed necessary the hard way — the
    // real deployed Lambda's restricted process/PID namespace kept crashing
    // Chromium's normal multi-process architecture (zygote + sandbox-host +
    // renderer) immediately after launch, every time, even though a local
    // Docker/RIE run (a much less restricted process environment) never
    // reproduced it — the same class of "works locally, not on real Lambda"
    // gap as the HOME=/tmp fix above. This is the standard workaround every
    // serverless-Chromium project on Lambda uses (e.g. @sparticuz/chromium).
    return await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process', '--no-zygote'],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to launch the browser.';
    throw new ScreenshotCaptureError(message, 'browser_launch_failed');
  }
}

async function newContext(
  browser: Browser,
  viewport: ViewportName,
  captureToken?: { cookieDomain: string; token: string },
  vercelBypassSecret?: string,
  sameOriginBase?: string,
): Promise<BrowserContext> {
  const context = await browser.newContext({
    viewport: VIEWPORTS[viewport],
    // Vercel's Deployment Protection sits in front of the whole dev preview
    // deployment at the edge, before any Next.js request handler runs —
    // separate from (and in front of) the capture-token cookie below, which
    // only solves app-level draft protection. This header (Vercel's own
    // "Protection Bypass for Automation" mechanism) applies to every request
    // this context makes — main navigation and subresources alike — so it's
    // set at the context level rather than per-request. `generated_preview`
    // only; irrelevant for `existing_site`'s real external business sites.
    ...(vercelBypassSecret
      ? { extraHTTPHeaders: { 'x-vercel-protection-bypass': vercelBypassSecret, 'x-vercel-set-bypass-cookie': 'true' } }
      : {}),
  });
  if (captureToken) {
    await context.addCookies([
      {
        name: CAPTURE_TOKEN_COOKIE_NAME,
        value: captureToken.token,
        domain: captureToken.cookieDomain,
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
      },
    ]);
  }
  await guardNavigationRequests(context, sameOriginBase);
  return context;
}

/**
 * Captures a single viewport of `url` and returns the PNG bytes. Never
 * catches its own errors — the caller (`handler.ts`) is what turns a thrown
 * `ScreenshotCaptureError` into that viewport's own `captureResults` entry,
 * so one viewport's failure never aborts the other (see "Operational
 * parameters", "Partial success handling").
 *
 * `sameOriginBase` (Stage 25): set only for the `generated_preview` target
 * (its own app base URL) — see `guardNavigationRequests`. Left unset for
 * `existing_site`, which is validated against the general SSRF blocklist
 * instead.
 */
export async function captureViewport(params: {
  browser: Browser;
  url: string;
  viewport: ViewportName;
  captureToken?: { cookieDomain: string; token: string };
  vercelBypassSecret?: string;
  sameOriginBase?: string;
}): Promise<Buffer> {
  const context = await newContext(params.browser, params.viewport, params.captureToken, params.vercelBypassSecret, params.sameOriginBase);
  try {
    const page = await context.newPage();

    let response: Awaited<ReturnType<typeof page.goto>>;
    try {
      response = await page.goto(params.url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // ERR_BLOCKED_BY_CLIENT is guardNavigationRequests' own abort reason
      // (Stage 25) — the initial URL or a redirect hop failed the SSRF
      // blocklist. Distinct from a generic load failure so it's visible as
      // such in captureResults, not misreported as an ordinary page error.
      const category = /err_blocked_by_client/i.test(message)
        ? 'blocked_url'
        : /timeout/i.test(message)
          ? 'navigation_timeout'
          : 'page_load_failed';
      throw new ScreenshotCaptureError(`Navigation failed: ${message}`, category);
    }

    // 403/429 on the top-level navigation is the common signature of bot
    // protection (Cloudflare, PerimeterX, etc.) rather than a genuine
    // page-load failure — a coarse heuristic, not perfect detection, but
    // worth distinguishing in the admin-facing failure category.
    const status = response?.status();
    if (status === 403 || status === 429) {
      throw new ScreenshotCaptureError(`Navigation returned HTTP ${status} — likely blocked by bot protection.`, 'blocked_by_bot_protection');
    }

    // Bounded wait for web fonts — never lets a font that never resolves
    // hang the whole capture past its own small timeout. Passed as a
    // source string, not a TS function, so this file's Node-only `lib`
    // (no DOM) never needs to know what `document` is — the string is
    // evaluated inside the page's own browser context by Playwright.
    await Promise.race([
      page.evaluate('document.fonts.ready').catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, FONTS_READY_TIMEOUT_MS)),
    ]);

    await page.waitForSelector('body', { state: 'visible', timeout: NAVIGATION_TIMEOUT_MS }).catch(() => {
      throw new ScreenshotCaptureError('Page body never became visible.', 'page_load_failed');
    });

    // Best-effort, bounded network-idle — an enhancement, never a
    // requirement (see class doc — this must never block capture
    // indefinitely the way relying on it as the primary condition would).
    await page.waitForLoadState('networkidle', { timeout: NETWORK_IDLE_BEST_EFFORT_MS }).catch(() => undefined);

    await new Promise((resolve) => setTimeout(resolve, STABILIZATION_DELAY_MS));

    await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS }).catch(() => undefined);

    let screenshot: Buffer;
    try {
      // fullPage: false, deliberately — see "Operational parameters",
      // "Viewport capture": above-the-fold only, never a full-page
      // scrolling capture (postcard usability + bounded file size).
      screenshot = await page.screenshot({ type: 'png', fullPage: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ScreenshotCaptureError(`Screenshot capture failed: ${message}`, 'screenshot_failed');
    }

    if (screenshot.byteLength > MAX_SCREENSHOT_BYTES) {
      throw new ScreenshotCaptureError(
        `Screenshot exceeded the ${MAX_SCREENSHOT_BYTES}-byte sanity bound (${screenshot.byteLength} bytes).`,
        'screenshot_failed',
      );
    }

    return screenshot;
  } finally {
    await context.close().catch(() => undefined);
  }
}
