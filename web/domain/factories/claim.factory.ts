import type { Claim } from '@/domain/models/claim';
import { ClaimSchema } from '@/domain/schemas/claim.schema';
import { generateId, nowIso } from './utils';

/** Default claim-token validity window — 30 days, generous for physical mail delivery. */
export const CLAIM_DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface CreateClaimInput {
  businessId: string;
  /** HMAC-SHA256 of the normalized raw token — never the raw token itself. */
  tokenHash: string;
  postcardId?: string;
  previewId?: string;
  /** Defaults to `CLAIM_DEFAULT_TTL_MS` from now when omitted. */
  expiresAt?: string;
}

/**
 * Create a new Claim record in `'issued'` status.
 *
 * The raw token is generated and hashed by the caller (see
 * `lib/claim/token.ts`) — this factory only ever sees `tokenHash`.
 */
export function createClaim(input: CreateClaimInput): Claim {
  const now = nowIso();

  const record: Claim = {
    claimId: generateId('claim_'),
    businessId: input.businessId,
    ...(input.postcardId !== undefined && { postcardId: input.postcardId }),
    ...(input.previewId !== undefined && { previewId: input.previewId }),
    tokenHash: input.tokenHash,
    status: 'issued',
    expiresAt: input.expiresAt ?? new Date(Date.now() + CLAIM_DEFAULT_TTL_MS).toISOString(),
    createdAt: now,
    updatedAt: now,
  };

  ClaimSchema.parse(record);
  return record;
}
