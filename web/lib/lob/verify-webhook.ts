import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Lob webhook signature verification — confirmed against Lob's live docs
 * (help.lob.com, "Using webhooks"):
 *
 *   1. Signature input = `${timestamp}.${rawBody}` (timestamp as a string,
 *      literal `.` separator, then the raw, unparsed request body).
 *   2. Expected signature = HMAC-SHA256(webhookSecret, signature input),
 *      hex-encoded.
 *   3. Compare against the `Lob-Signature` header (constant-time, mirroring
 *      `lib/internal-auth.ts`'s `safeEquals`).
 *   4. Reject if `Lob-Signature-Timestamp` is older than a tolerance
 *      (Lob's own recommendation: 5 minutes) — replay-attack protection.
 *
 * The webhook secret is per-webhook and only obtainable from Lob's
 * dashboard when the webhook is created there (no API for it) — see
 * `web/lib/secrets/index.ts`'s `LobSecret.webhookSecret` doc comment.
 */

export const LOB_SIGNATURE_HEADER = 'lob-signature';
export const LOB_SIGNATURE_TIMESTAMP_HEADER = 'lob-signature-timestamp';
const REPLAY_TOLERANCE_MS = 5 * 60 * 1000;

function safeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function verifyLobWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  timestampHeader: string | null;
  webhookSecret: string;
  now?: number;
}): boolean {
  const { rawBody, signatureHeader, timestampHeader, webhookSecret } = params;
  if (!signatureHeader || !timestampHeader) return false;

  const timestampMs = Number(timestampHeader) * 1000;
  if (!Number.isFinite(timestampMs)) return false;

  const now = params.now ?? Date.now();
  if (Math.abs(now - timestampMs) > REPLAY_TOLERANCE_MS) return false;

  const signatureInput = `${timestampHeader}.${rawBody}`;
  const expectedSignature = createHmac('sha256', webhookSecret).update(signatureInput).digest('hex');

  return safeEquals(signatureHeader, expectedSignature);
}
