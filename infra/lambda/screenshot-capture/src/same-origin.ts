/**
 * Strict same-origin policy for the `generated_preview` capture target —
 * deliberately *not* the general SSRF guard (`url-validation.ts`), since
 * this destination is never actually untrusted: it's always Webpresa's own
 * app. See implementation.md, Stage 14, "URL validation" — the "not
 * over-engineered" call the user made during planning.
 */

export interface SameOriginResult {
  ok: boolean;
  url?: string;
}

/**
 * Builds the preview URL from *only* the configured app origin and the
 * canonical slug — never a caller-supplied path — and confirms the result
 * is actually within that origin (defense against a malformed/absolute
 * slug somehow smuggling a different host in).
 */
export function buildPreviewUrl(appBaseUrl: string, slug: string): SameOriginResult {
  let base: URL;
  try {
    base = new URL(appBaseUrl);
  } catch {
    return { ok: false };
  }

  const candidate = new URL(`/b/${encodeURIComponent(slug)}`, base);
  if (candidate.origin !== base.origin) return { ok: false };
  return { ok: true, url: candidate.toString() };
}

/** Called on every response/redirect Playwright follows while on this target. */
export function isWithinConfiguredOrigin(appBaseUrl: string, url: string): boolean {
  try {
    return new URL(url).origin === new URL(appBaseUrl).origin;
  } catch {
    return false;
  }
}
