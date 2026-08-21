import { z } from 'zod';
import { MARKETING_OUTREACH_STATUSES } from '@/domain/models/marketing-outreach';
import { EMAIL_SEQUENCES } from '@/domain/models/email-template';
import { IsoTimestampSchema } from './common.schema';

const EmailSequenceLiteralSchema = z.union([z.literal(EMAIL_SEQUENCES[0]), z.literal(EMAIL_SEQUENCES[1]), z.literal(EMAIL_SEQUENCES[2])]);

export const MarketingOutreachSchema = z.object({
  businessId: z.string().regex(/^biz_/),
  marketingCampaignId: z.string().regex(/^mktgcampaign_/),
  postcardId: z.string().regex(/^postcard_/),
  campaignRecipientId: z.string().regex(/^recipient_/).optional(),
  deliveredAt: IsoTimestampSchema,
  status: z.enum(MARKETING_OUTREACH_STATUSES),
  suppressionReason: z.string().min(1).optional(),
  currentSequence: z.union([z.literal(0), EmailSequenceLiteralSchema]),
  nextActionSequence: EmailSequenceLiteralSchema.optional(),
  nextActionAt: IsoTimestampSchema.optional(),
  sendAttemptCount: z.number().int().nonnegative(),
  unsubscribeToken: z.string().min(16),
  lastEventAt: IsoTimestampSchema.optional(),
  lastEventType: z.string().min(1).optional(),
  pauseReason: z.string().min(1).optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
