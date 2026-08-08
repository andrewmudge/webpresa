import { putPdf, getSecretJson } from './aws';
import { mintCaptureToken } from './capture-token';
import { launchBrowser, capturePdf, PostcardRenderError } from './browser';
import type { RenderPayload, RenderResult } from './types';

/**
 * Stage 22 Phase 2 render Lambda entrypoint. Unlike screenshot-capture's
 * handler (fire-and-forget, owns ScanEvent status transitions end to end),
 * this one is invoked **synchronously** (`InvocationType: 'RequestResponse'`
 * from `web/lib/postcards/render.ts`) and does exactly one thing: render
 * one side of one postcard and hand back where it landed in S3. No status
 * bookkeeping happens here at all — the caller owns updating
 * `Postcard.frontArtifactKey`/`backArtifactKey`/`renderedAt` once this
 * returns successfully. A thrown error here propagates directly back to
 * that caller as a rejected invocation — no DLQ, no retry — since a
 * synchronous admin-facing action is the right place to surface "render
 * failed, try again," not a queue.
 */

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set`);
  return value;
}

export async function handler(event: RenderPayload): Promise<RenderResult> {
  const appBaseUrl = env('WEBPRESA_APP_BASE_URL');
  const renderUrl = new URL(`/internal/postcards/${event.postcardId}/render/${event.side}`, appBaseUrl).toString();

  const { signingKey } = await getSecretJson(env('CAPTURE_TOKEN_SECRET_NAME'));
  const token = await mintCaptureToken({ postcardId: event.postcardId, signingKey });
  const captureToken = { cookieDomain: new URL(appBaseUrl).hostname, token };

  // Same Vercel Deployment Protection gate Stage 14's Lambda navigates
  // around — see browser.ts's newContext() and screenshot-capture's
  // identical comment for the full rationale.
  const { bypassSecret } = await getSecretJson(env('VERCEL_PROTECTION_BYPASS_SECRET_NAME'));

  let browser: Awaited<ReturnType<typeof launchBrowser>> | undefined;
  try {
    browser = await launchBrowser();
    const pdf = await capturePdf({ browser, url: renderUrl, captureToken, vercelBypassSecret: bypassSecret });

    const storageKey = `postcards/${event.businessId}/${event.postcardId}/${event.side}.pdf`;
    await putPdf(env('ASSETS_BUCKET_NAME'), storageKey, pdf);

    return { storageKey };
  } catch (err) {
    if (err instanceof PostcardRenderError) throw err;
    const message = err instanceof Error ? err.message : `Unknown error rendering the ${event.side} of postcard ${event.postcardId}.`;
    throw new Error(message);
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
