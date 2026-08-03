import { z } from 'zod';
import { CAMPAIGN_CHANNELS, CAMPAIGN_STATUSES } from '@/domain/models/campaign';
import { IsoTimestampSchema } from './common.schema';

export const CampaignSchema = z.object({
  campaignId: z
    .string()
    .regex(/^campaign_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
  name: z.string().min(1).max(200),
  channel: z.enum(CAMPAIGN_CHANNELS),
  status: z.enum(CAMPAIGN_STATUSES),
  expiresAt: IsoTimestampSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export type CampaignSchemaInput = z.input<typeof CampaignSchema>;
