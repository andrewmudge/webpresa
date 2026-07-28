import type { MutableTimestampedRecord } from './common';

// ---------------------------------------------------------------------------
// Status enum
// ---------------------------------------------------------------------------

export const CLAIM_STATUSES = ['issued', 'consumed', 'expired', 'revoked'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

// ---------------------------------------------------------------------------
// Claim record
// ---------------------------------------------------------------------------

/**
 * A single-use ownership-claim token issued for one Business (Stage 17).
 *
 * `status` models token lifecycle only — issued / consumed / expired /
 * revoked — and is never overloaded with ownership or subscription meaning.
 * Ownership itself lives on `Business.ownerUserId`/`claimedAt`, set only by
 * the transaction that consumes this record (see `lib/db/claims.ts`,
 * `consumeClaim`).
 *
 * `tokenHash` is the only representation of the token ever persisted — an
 * HMAC-SHA256 of the normalized raw token, keyed by a dedicated
 * Secrets-Manager-held pepper (see `lib/claim/token.ts`). The raw token
 * itself is never written to this or any other record.
 */
export interface Claim extends MutableTimestampedRecord {
  /** Globally unique identifier.  Format: `claim_<uuid>` */
  claimId: string;
  businessId: string;
  /** Which postcard/campaign issued this token, for provenance only. */
  postcardId?: string;
  /** The preview shown at issuance time, for audit only. */
  previewId?: string;
  /** HMAC-SHA256(normalizedToken, claimTokenSecret) — never the raw token. */
  tokenHash: string;
  status: ClaimStatus;
  /** ISO 8601 — enforced at read time; never a DynamoDB TTL deletion. */
  expiresAt: string;
  /** Cognito `sub` of the customer who consumed this claim. */
  consumedByUserId?: string;
  consumedAt?: string;
  revokedAt?: string;
  /** Free text, admin-entered. */
  revokedReason?: string;
}
