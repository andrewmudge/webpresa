import { chromium, type Browser, type BrowserContext } from 'playwright-core';
import { CAPTURE_TOKEN_COOKIE_NAME } from './capture-token';

/**
 * PDF capture — Stage 22 Phase 2's counterpart to screenshot-capture's
 * `captureViewport`. Structurally mirrors it closely (same launch flags,
 * same font/body/network-idle wait sequence, same per-invocation browser
 * — see `launchBrowser`'s doc comment, copied verbatim from
 * screenshot-capture/src/browser.ts since it's a Lambda-environment fact,
 * not something specific to screenshots). The actual capture call is
 * `page.pdf()`, not `page.screenshot()`: no viewport/fullPage concept —
 * it captures the full rendered document at a fixed physical page size,
 * which is exactly what a postcard's print artwork needs.
 *
 * `PAGE_SIZE_INCHES` mirrors `POSTCARD_BLEED_SIZE_INCHES` from
 * `web/app/admin/(dashboard)/postcards/components/postcard-size.ts` (the
 * authoritative source — see that file's doc comment). Hand-mirrored, not
 * imported: this Lambda is a fully independent npm project with no
 * workspace tooling (see types.ts's doc comment for the same constraint
 * elsewhere in this file set). If the postcard size ever changes, both
 * copies must be updated together.
 */

const PAGE_SIZE_INCHES = { width: 9.25, height: 6.25 };

const NAVIGATION_TIMEOUT_MS = 30_000;
const FONTS_READY_TIMEOUT_MS = 5_000;
const STABILIZATION_DELAY_MS = 1_500;
const NETWORK_IDLE_BEST_EFFORT_MS = 3_000;
/** Sanity backstop — a static, image-heavy single page should never approach this. */
const MAX_PDF_BYTES = 20 * 1024 * 1024;

const DISABLE_ANIMATIONS_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
`;

export class PostcardRenderError extends Error {
  constructor(
    message: string,
    public readonly category: 'browser_launch_failed' | 'navigation_timeout' | 'page_load_failed' | 'pdf_failed',
  ) {
    super(message);
  }
}

/** Identical to screenshot-capture's launchBrowser — see that file's doc comment for the full "why these exact flags" rationale (confirmed against the real deployed Lambda, not just local Docker/RIE). */
export async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process', '--no-zygote'],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to launch the browser.';
    throw new PostcardRenderError(message, 'browser_launch_failed');
  }
}

async function newContext(
  browser: Browser,
  captureToken: { cookieDomain: string; token: string },
  vercelBypassSecret?: string,
): Promise<BrowserContext> {
  const context = await browser.newContext({
    // No `viewport` override — page.pdf() ignores viewport for layout
    // (it uses the CSS page size / `format`/`width`/`height` PDF options
    // instead), but Playwright still requires *some* context to create a
    // page in, so the default is left as-is.
    ...(vercelBypassSecret
      ? { extraHTTPHeaders: { 'x-vercel-protection-bypass': vercelBypassSecret, 'x-vercel-set-bypass-cookie': 'true' } }
      : {}),
  });
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
  return context;
}

/**
 * Renders `url` (an internal `/internal/postcards/[postcardId]/render/[side]`
 * page) to a print-ready PDF sized to the postcard's full bleed canvas.
 * Never catches its own errors — the caller (`handler.ts`) turns a thrown
 * `PostcardRenderError` into the invocation's own failure, since (unlike
 * screenshot-capture's two-viewports-per-scan partial-success model) a
 * single render call only ever produces one side of one postcard — there's
 * no "other viewport" to fall back to.
 */
export async function capturePdf(params: {
  browser: Browser;
  url: string;
  captureToken: { cookieDomain: string; token: string };
  vercelBypassSecret?: string;
}): Promise<Buffer> {
  const context = await newContext(params.browser, params.captureToken, params.vercelBypassSecret);
  try {
    const page = await context.newPage();

    let response: Awaited<ReturnType<typeof page.goto>>;
    try {
      response = await page.goto(params.url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const category = /timeout/i.test(message) ? 'navigation_timeout' : 'page_load_failed';
      throw new PostcardRenderError(`Navigation failed: ${message}`, category);
    }

    const status = response?.status();
    if (status !== undefined && status >= 400) {
      throw new PostcardRenderError(`Navigation to the internal render page returned HTTP ${status}.`, 'page_load_failed');
    }

    await Promise.race([
      page.evaluate('document.fonts.ready').catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, FONTS_READY_TIMEOUT_MS)),
    ]);

    await page.waitForSelector('body', { state: 'visible', timeout: NAVIGATION_TIMEOUT_MS }).catch(() => {
      throw new PostcardRenderError('Page body never became visible.', 'page_load_failed');
    });

    await page.waitForLoadState('networkidle', { timeout: NETWORK_IDLE_BEST_EFFORT_MS }).catch(() => undefined);

    await new Promise((resolve) => setTimeout(resolve, STABILIZATION_DELAY_MS));

    await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS }).catch(() => undefined);

    // Playwright's page.pdf() renders under `print` CSS media by default,
    // not `screen`, unless told otherwise — confirmed the hard way: this
    // codebase has zero `@media print` rules anywhere, so every postcard
    // has only ever been designed/approved under `screen` media, while
    // this pipeline was silently rendering under a media context nobody
    // tested against. That mismatch — not any individual component's
    // styling — was the root cause of rectangular artifacts appearing
    // around box-shadowed footer elements (the QR card, the OR-divider
    // circle, the access-code pill) in the PDF but not the browser:
    // Chromium's print/PDF compositor is a genuinely different rendering
    // path from its screen compositor, and blur+radius box-shadows are a
    // known case that can render differently there. Forcing `screen`
    // media makes this pipeline reproduce the approved browser rendering
    // path exactly, since there's no print stylesheet to diverge from it.
    await page.emulateMedia({ media: 'screen' });

    let pdf: Buffer;
    try {
      pdf = await page.pdf({
        width: `${PAGE_SIZE_INCHES.width}in`,
        height: `${PAGE_SIZE_INCHES.height}in`,
        printBackground: true,
        margin: { top: '0in', right: '0in', bottom: '0in', left: '0in' },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new PostcardRenderError(`PDF capture failed: ${message}`, 'pdf_failed');
    }

    if (pdf.byteLength > MAX_PDF_BYTES) {
      throw new PostcardRenderError(`PDF exceeded the ${MAX_PDF_BYTES}-byte sanity bound (${pdf.byteLength} bytes).`, 'pdf_failed');
    }

    return pdf;
  } finally {
    await context.close().catch(() => undefined);
  }
}
