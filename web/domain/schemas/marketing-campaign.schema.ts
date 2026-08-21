import { z } from 'zod';
import { MARKETING_CAMPAIGN_STATUSES } from '@/domain/models/marketing-campaign';
import { IsoTimestampSchema } from './common.schema';

export const MarketingCampaignSchema = z.object({
  marketingCampaignId: z.string().regex(/^mktgcampaign_/),
  name: z.string().min(1),
  status: z.enum(MARKETING_CAMPAIGN_STATUSES),
  updatedBy: z.string().min(1).optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
