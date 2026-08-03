import { z } from 'zod';
import { CAMPAIGN_RECIPIENT_STATUSES, CAMPAIGN_RECIPIENT_DESTINATION_TYPES } from '@/domain/models/campaign-recipient';
import { IsoTimestampSchema } from './common.schema';

/**
 * Crockford Base32 (excludes ambiguous I, L, O, U), exactly 16 characters —
 * 80 bits of entropy, no dash grouping (never hand-typed; embedded directly
 * in `/r/{code}` URLs and QR images). See `lib/campaign/code.ts`.
 */
export const CampaignCodeSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{16}$/);

export const CampaignRecipientSchema = z
  .object({
    campaignRecipientId: z
      .string()
      .regex(/^recipient_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
    campaignId: z.string().regex(/^campaign_/),
    businessId: z.string().regex(/^biz_/),
    campaignCode: CampaignCodeSchema,
    // Defaults to 'custom' when absent — backward compatibility for
    // recipients created before this field existed, which always carried an
    // explicit destinationUrl.
    destinationType: z.enum(CAMPAIGN_RECIPIENT_DESTINATION_TYPES).optional().default('custom'),
    claimId: z.string().regex(/^claim_/).optional(),
    destinationUrl: z.string().url().optional(),
    destinationLabel: z.string().max(200).optional(),
    status: z.enum(CAMPAIGN_RECIPIENT_STATUSES),
    postcardId: z.string().regex(/^postcard_/).optional(),
    totalScans: z.number().int().min(0),
    estimatedUniqueScans: z.number().int().min(0),
    firstScanAt: IsoTimestampSchema.optional(),
    lastScanAt: IsoTimestampSchema.optional(),
    createdAt: IsoTimestampSchema,
    updatedAt: IsoTimestampSchema,
  })
  .superRefine((value, ctx) => {
    if (value.destinationType === 'custom' && !value.destinationUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "destinationUrl is required when destinationType is 'custom'", path: ['destinationUrl'] });
    }
    if (value.destinationType === 'claim' && value.destinationUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "destinationUrl must be absent when destinationType is 'claim'", path: ['destinationUrl'] });
    }
    if (value.destinationType === 'custom' && value.claimId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "claimId must be absent when destinationType is 'custom'", path: ['claimId'] });
    }
  });

export type CampaignRecipientSchemaInput = z.input<typeof CampaignRecipientSchema>;
