import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * OpenSRS Storefront webhook signature verification.
 *
 * Confirmed 2026-08-29 against a real "Send Test" delivery in the PTE
 * environment (Storefront's own docs only ever say "compute the signature
 * ... and compare it against the signature header," never naming the
 * header or algorithm explicitly): the header is `x-signature`, formatted
 * `sha256=<hex digest>` — the `sha256=` prefix must be stripped before
 * comparing against the computed HMAC-SHA256(webhookKey, rawBody) hex
 * digest. No timestamp header was present on the test delivery, so (unlike
 * `lib/lob/verify-webhook.ts`) there's no replay-window check here.
 */

export const OPENSRS_SIGNATURE_HEADER = 'x-signature';
const SIGNATURE_PREFIX = 'sha256=';

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
  if (!signatureHeader?.startsWith(SIGNATURE_PREFIX)) return false;

  const providedDigest = signatureHeader.slice(SIGNATURE_PREFIX.length);
  const expectedDigest = createHmac('sha256', webhookKey).update(rawBody).digest('hex');
  return safeEquals(providedDigest, expectedDigest);
}
