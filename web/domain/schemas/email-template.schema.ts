import { z } from 'zod';
import { EMAIL_SEQUENCES } from '@/domain/models/email-template';
import { IsoTimestampSchema } from './common.schema';

export const EmailTemplateSchema = z.object({
  marketingCampaignId: z.string().regex(/^mktgcampaign_/),
  emailSequence: z.union([z.literal(EMAIL_SEQUENCES[0]), z.literal(EMAIL_SEQUENCES[1]), z.literal(EMAIL_SEQUENCES[2])]),
  subject: z.string().min(1),
  body: z.string().min(1),
  version: z.number().int().positive(),
  updatedBy: z.string().min(1).optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
