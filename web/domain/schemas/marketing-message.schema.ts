import { z } from 'zod';
import { MARKETING_MESSAGE_OUTCOMES, MARKETING_SES_EVENT_STATUSES } from '@/domain/models/marketing-message';
import { EMAIL_SEQUENCES } from '@/domain/models/email-template';
import { IsoTimestampSchema } from './common.schema';

export const MarketingMessageSchema = z.object({
  messageId: z.string().regex(/^mktgmsg_/),
  businessId: z.string().regex(/^biz_/),
  marketingCampaignId: z.string().regex(/^mktgcampaign_/),
  emailSequence: z.union([z.literal(EMAIL_SEQUENCES[0]), z.literal(EMAIL_SEQUENCES[1]), z.literal(EMAIL_SEQUENCES[2])]),
  sortKey: z.string().min(1),
  outcome: z.enum(MARKETING_MESSAGE_OUTCOMES),
  skipReason: z.string().min(1).optional(),
  failureReason: z.string().min(1).optional(),
  attemptedAt: IsoTimestampSchema,
  sentAt: IsoTimestampSchema.optional(),
  subjectSnapshot: z.string().optional(),
  htmlBodySnapshot: z.string().optional(),
  textBodySnapshot: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  sesMessageId: z.string().min(1).optional(),
  sesEventStatus: z.enum(MARKETING_SES_EVENT_STATUSES).optional(),
  deliveredAt: IsoTimestampSchema.optional(),
  bouncedAt: IsoTimestampSchema.optional(),
  complainedAt: IsoTimestampSchema.optional(),
  clickCount: z.number().int().nonnegative(),
  firstClickAt: IsoTimestampSchema.optional(),
  lastClickAt: IsoTimestampSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
