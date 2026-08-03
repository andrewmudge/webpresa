import 'server-only';
import { randomBytes, createHmac } from 'crypto';
import { getClaimTokenSecret } from '@/lib/secrets';

/**
 * Claim-token generation, normalization, and hashing (Stage 17).
 *
 * The raw token exists only in memory — generated once by the admin
 * "generate claim link" action and returned once in that action's response.
 * It is never persisted anywhere; only its HMAC hash (`Claim.tokenHash`) is
 * ever written to storage. There is no "reveal token again" capability, by
 * design — if the raw token is lost, the only recovery is revoking the claim
 * and issuing a replacement (see `lib/db/businesses.ts`, `releaseOwnership`,
 * and the admin claim-link actions).
 */

// ---------------------------------------------------------------------------
// Crockford Base32 — excludes ambiguous I, L, O, U
// ---------------------------------------------------------------------------

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

function groupWithDashes(value: string, groupSize: number): string {
  const groups: string[] = [];
  for (let i = 0; i < value.length; i += groupSize) {
    groups.push(value.slice(i, i + groupSize));
  }
  return groups.join('-');
}

// ---------------------------------------------------------------------------
// Generation / normalization / hashing
// ---------------------------------------------------------------------------

/**
 * Generate a new 80-bit (10-byte) random claim token, Crockford
 * Base32-encoded and dash-grouped in fours for manual entry — 80 bits
 * encodes to exactly 16 base32 characters (4 groups), e.g.
 * `XXXX-XXXX-XXXX-XXXX`.
 */
export function generateClaimToken(): string {
  const bytes = randomBytes(10);
  return groupWithDashes(encodeCrockfordBase32(bytes), 4);
}

/**
 * Normalize a raw or manually-typed token before every hash or comparison:
 * strip whitespace/dashes, uppercase. `xxxx-xxxx-...` and `XXXXXXXX...`
 * always normalize identically.
 */
export function normalizeClaimToken(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * HMAC-SHA256 of the normalized token, keyed by a dedicated Secrets-Manager
 * pepper (`webpresa-{env}-claim-token`) — never plain SHA-256. A leaked
 * Claims table alone doesn't let an attacker offline-brute-force candidate
 * tokens without also compromising the Secrets Manager secret.
 */
export async function hashClaimToken(normalizedToken: string): Promise<string> {
  const { hmacSecret } = await getClaimTokenSecret();
  return createHmac('sha256', hmacSecret).update(normalizedToken).digest('hex');
}

export interface GeneratedClaimToken {
  /** Exists only in memory — never persist this. */
  rawToken: string;
  /** The only representation ever written to storage. */
  tokenHash: string;
}

/** Generate a new claim token and its hash together — the admin claim-link action's single entry point. */
export async function generateAndHashClaimToken(): Promise<GeneratedClaimToken> {
  const rawToken = generateClaimToken();
  const tokenHash = await hashClaimToken(normalizeClaimToken(rawToken));
  return { rawToken, tokenHash };
}
