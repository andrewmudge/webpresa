import { z } from 'zod';
import { POSTCARD_STATUSES, POSTCARD_PROVIDERS } from '@/domain/models/postcard';
import { IsoTimestampSchema } from './common.schema';

export const PostcardSchema = z.object({
  postcardId: z
    .string()
    .regex(/^postcard_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
  businessId: z.string().regex(/^biz_/),
  previewId: z.string().regex(/^preview_/),
  provider: z.enum(POSTCARD_PROVIDERS),
  providerPostcardId: z.string().optional(),
  campaignCode: z.string().min(1),
  qrDestination: z.string().url(),
  status: z.enum(POSTCARD_STATUSES),
  mailedAt: IsoTimestampSchema.optional(),
  deliveredAt: IsoTimestampSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
