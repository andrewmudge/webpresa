import { chromium, type Browser, type BrowserContext } from 'playwright-core';
import { CAPTURE_TOKEN_COOKIE_NAME } from './capture-token';

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
    public readonly category: 'browser_launch_failed' | 'navigation_timeout' | 'page_load_failed' | 'blocked_by_bot_protection' | 'screenshot_failed',
  ) {
    super(message);
  }
}

export async function launchBrowser(): Promise<Browser> {
  try {
    // Resolves the browser via PLAYWRIGHT_BROWSERS_PATH, set in the
    // Dockerfile to match the Microsoft Playwright base image's install
    // location — see Dockerfile for the full rationale. --no-sandbox and
    // --disable-dev-shm-usage are the standard, well-documented flags for
    // running Chromium inside a container with a small /dev/shm.
    return await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
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
): Promise<BrowserContext> {
  const context = await browser.newContext({ viewport: VIEWPORTS[viewport] });
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
  return context;
}

/**
 * Captures a single viewport of `url` and returns the PNG bytes. Never
 * catches its own errors — the caller (`handler.ts`) is what turns a thrown
 * `ScreenshotCaptureError` into that viewport's own `captureResults` entry,
 * so one viewport's failure never aborts the other (see "Operational
 * parameters", "Partial success handling").
 */
export async function captureViewport(params: {
  browser: Browser;
  url: string;
  viewport: ViewportName;
  captureToken?: { cookieDomain: string; token: string };
}): Promise<Buffer> {
  const context = await newContext(params.browser, params.viewport, params.captureToken);
  try {
    const page = await context.newPage();

    let response: Awaited<ReturnType<typeof page.goto>>;
    try {
      response = await page.goto(params.url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const category = /timeout/i.test(message) ? 'navigation_timeout' : 'page_load_failed';
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
