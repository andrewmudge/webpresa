import 'server-only';

/**
 * The app's own canonical base URL (e.g. for building Stripe return URLs, or
 * displaying a business's public address in onboarding). Extracted from
 * `app/account/checkout/actions.ts`, which had its own private copy — now
 * the one shared implementation.
 */
export function resolveAppBaseUrl(): string {
  const base = process.env.WEBPRESA_APP_BASE_URL;
  if (!base) throw new Error('WEBPRESA_APP_BASE_URL environment variable is not set');
  return base;
}
