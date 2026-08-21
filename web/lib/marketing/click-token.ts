import 'server-only';
import { EncryptJWT, jwtDecrypt } from 'jose';
import type { EmailSequence } from '@/domain/models/email-template';
import { getMarketingClickTokenSecret } from '@/lib/secrets';

/**
 * Self-contained encrypted click-tracking token for the `/e/[token]`
 * redirect — a JWE (`dir`/`A256GCM`), not a database-backed lookup token.
 * Deliberately separate from `/r/[campaignCode]` (postcard QR redirect,
 * Stage 21), which uses a short, human-typeable code — this token is never
 * typed by a person and must not expose raw internal ids (see
 * `implementation.md`, Marketing stage, "Click tracking"). No expiry is
 * set — an email link should keep working for as long as a recipient might
 * plausibly open an old email.
 */
export interface ClickTokenPayload {
  messageId: string;
  businessId: string;
  marketingCampaignId: string;
  emailSequence: EmailSequence;
  linkLabel: string;
  destinationUrl: string;
}

async function getEncryptionKey(): Promise<Uint8Array> {
  const { encryptionKey } = await getMarketingClickTokenSecret();
  // A256GCM requires exactly 32 bytes — the secret's placeholder/real value
  // is an opaque random string, so derive a fixed-length key from it rather
  // than requiring the Secrets Manager value itself be exactly 32 bytes.
  const { createHash } = await import('crypto');
  return new Uint8Array(createHash('sha256').update(encryptionKey).digest());
}

export async function createClickToken(payload: ClickTokenPayload): Promise<string> {
  const key = await getEncryptionKey();
  return new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .encrypt(key);
}

/** Returns `null` on any decryption/validation failure — the caller (`/e/[token]`) responds 404, never a 500, since a malformed or tampered token isn't an internal error. */
export async function decodeClickToken(token: string): Promise<ClickTokenPayload | null> {
  try {
    const key = await getEncryptionKey();
    const { payload } = await jwtDecrypt(token, key);
    if (
      typeof payload.messageId !== 'string' ||
      typeof payload.businessId !== 'string' ||
      typeof payload.marketingCampaignId !== 'string' ||
      typeof payload.emailSequence !== 'number' ||
      typeof payload.linkLabel !== 'string' ||
      typeof payload.destinationUrl !== 'string'
    ) {
      return null;
    }
    return {
      messageId: payload.messageId,
      businessId: payload.businessId,
      marketingCampaignId: payload.marketingCampaignId,
      emailSequence: payload.emailSequence as EmailSequence,
      linkLabel: payload.linkLabel,
      destinationUrl: payload.destinationUrl,
    };
  } catch {
    return null;
  }
}
