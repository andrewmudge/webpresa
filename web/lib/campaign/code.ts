import 'server-only';
import { randomBytes } from 'crypto';

/**
 * Campaign-code generation (Stage 21) — the opaque, unique lookup key each
 * CampaignRecipient's QR code encodes (`/r/{campaignCode}`).
 *
 * Same opaque-random-identifier approach as Stage 17's claim tokens
 * (Crockford Base32, excludes ambiguous I/L/O/U), sized for a URL/QR rather
 * than manual typing: 80 bits (not 160), no dash-grouping in the stored/
 * looked-up value itself (dashes are added only for display — see
 * `./code-format.ts` — and stripped back out on manual entry, for the `/r`
 * fallback page when a visitor can't scan the QR). 80 bits of entropy makes
 * a generation-time collision astronomically unlikely, so — matching the
 * claim-token precedent — generation needs no atomic uniqueness
 * transaction, only the `campaign-code-index` GSI for lookup (see
 * `lib/db/campaign-recipients.ts`).
 *
 * The Crockford encoder below is a small, self-contained duplicate of
 * `lib/claim/token.ts`'s rather than a shared extraction — Stage 21
 * deliberately doesn't touch Stage 17 files for a ~15-line pure function.
 *
 * Server-only (imports Node's `crypto`) — the display/normalization helpers
 * in `./code-format.ts` are split into their own file specifically so a
 * client component (the admin recipient card) can import them without
 * pulling this file's `server-only` guard into the client bundle.
 */

const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeCrockfordBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += CROCKFORD_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += CROCKFORD_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return output;
}

/**
 * Generate a new 80-bit (10-byte) random campaign code, Crockford
 * Base32-encoded (16 characters, no dash grouping) — embedded directly in
 * `/r/{code}` URLs and QR images, never hand-typed.
 *
 * Must never encode or be derivable from any database identifier
 * (businessId, claimId, postcardId, previewId, campaignId,
 * campaignRecipientId) — it is a pure random lookup key.
 */
export function generateCampaignCode(): string {
  return encodeCrockfordBase32(randomBytes(10));
}
