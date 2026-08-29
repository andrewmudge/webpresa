import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * OpenSRS Storefront webhook signature verification.
 *
 * **Not confirmed against real OpenSRS documentation** — the article with
 * the exact mechanics ("Storefront Webhook Notifications") is gated behind
 * reseller-support login and could not be fetched while planning this
 * integration (see `web/docs/open_srs.md`'s noted gap, and the plan's
 * "Environment isolation" section). What's confirmed instead, from
 * OpenSRS's public support-site search index: Storefront webhooks are
 * configured under Storefront Settings → Advanced Settings → Add Webhook,
 * and registering one returns a "webhook key."
 *
 * This implements the most common convention for that shape — HMAC-SHA256
 * over the raw request body, hex-encoded, compared constant-time — mirroring
 * `lib/lob/verify-webhook.ts`'s structure minus the timestamp/replay check
 * (unconfirmed whether OpenSRS sends one). **Before relying on this in the
 * PTE environment**: register a real webhook, inspect the actual headers a
 * delivery arrives with, and adjust `OPENSRS_SIGNATURE_HEADER` / the
 * digest computation below to match.
 */

export const OPENSRS_SIGNATURE_HEADER = 'x-opensrs-signature';

function safeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function verifyOpenSrsWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  webhookKey: string;
}): boolean {
  const { rawBody, signatureHeader, webhookKey } = params;
  if (!signatureHeader) return false;

  const expectedSignature = createHmac('sha256', webhookKey).update(rawBody).digest('hex');
  return safeEquals(signatureHeader, expectedSignature);
}
