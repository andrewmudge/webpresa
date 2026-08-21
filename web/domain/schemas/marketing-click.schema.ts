import { z } from 'zod';
import { EMAIL_SEQUENCES } from '@/domain/models/email-template';
import { IsoTimestampSchema } from './common.schema';

export const MarketingClickSchema = z.object({
  messageId: z.string().regex(/^mktgmsg_/),
  sortKey: z.string().regex(/^CLICK#/),
  businessId: z.string().regex(/^biz_/),
  marketingCampaignId: z.string().regex(/^mktgcampaign_/),
  emailSequence: z.union([z.literal(EMAIL_SEQUENCES[0]), z.literal(EMAIL_SEQUENCES[1]), z.literal(EMAIL_SEQUENCES[2])]),
  linkLabel: z.string().min(1),
  destinationUrl: z.string().min(1),
  clickedAt: IsoTimestampSchema,
  userAgent: z.string().optional(),
  ipHash: z.string().optional(),
  referrer: z.string().optional(),
  createdAt: IsoTimestampSchema,
});
