import { z } from 'zod';
import { CAMPAIGN_RECIPIENT_STATUSES } from '@/domain/models/campaign-recipient';
import { IsoTimestampSchema } from './common.schema';

/**
 * Crockford Base32 (excludes ambiguous I, L, O, U), exactly 16 characters —
 * 80 bits of entropy, no dash grouping (never hand-typed; embedded directly
 * in `/r/{code}` URLs and QR images). See `lib/campaign/code.ts`.
 */
export const CampaignCodeSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{16}$/);

export const CampaignRecipientSchema = z.object({
  campaignRecipientId: z
    .string()
    .regex(/^recipient_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
  campaignId: z.string().regex(/^campaign_/),
  businessId: z.string().regex(/^biz_/),
  campaignCode: CampaignCodeSchema,
  destinationUrl: z.string().url(),
  destinationLabel: z.string().max(200).optional(),
  status: z.enum(CAMPAIGN_RECIPIENT_STATUSES),
  postcardId: z.string().regex(/^postcard_/).optional(),
  totalScans: z.number().int().min(0),
  estimatedUniqueScans: z.number().int().min(0),
  firstScanAt: IsoTimestampSchema.optional(),
  lastScanAt: IsoTimestampSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export type CampaignRecipientSchemaInput = z.input<typeof CampaignRecipientSchema>;
