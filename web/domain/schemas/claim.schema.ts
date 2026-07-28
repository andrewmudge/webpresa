import { z } from 'zod';
import { CLAIM_STATUSES } from '@/domain/models/claim';
import { IsoTimestampSchema } from './common.schema';

export const ClaimSchema = z.object({
  claimId: z
    .string()
    .regex(/^claim_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
  businessId: z.string().regex(/^biz_/),
  postcardId: z.string().regex(/^postcard_/).optional(),
  previewId: z.string().regex(/^preview_/).optional(),
  /** Hex-encoded HMAC-SHA256 — 64 hex characters. */
  tokenHash: z.string().regex(/^[0-9a-f]{64}$/),
  status: z.enum(CLAIM_STATUSES),
  expiresAt: IsoTimestampSchema,
  consumedByUserId: z.string().min(1).optional(),
  consumedAt: IsoTimestampSchema.optional(),
  revokedAt: IsoTimestampSchema.optional(),
  revokedReason: z.string().max(500).optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export type ClaimSchemaInput = z.input<typeof ClaimSchema>;
