import { z } from 'zod';
import { POSTCARD_STATUSES, POSTCARD_PROVIDERS, POSTCARD_TEMPLATE_VARIANTS } from '@/domain/models/postcard';
import { IsoTimestampSchema } from './common.schema';

export const PostcardSchema = z.object({
  postcardId: z
    .string()
    .regex(/^postcard_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
  businessId: z.string().regex(/^biz_/),
  previewId: z.string().regex(/^preview_/),
  campaignRecipientId: z.string().regex(/^recipient_/).optional(),
  templateVariant: z.enum(POSTCARD_TEMPLATE_VARIANTS).optional(),
  provider: z.enum(POSTCARD_PROVIDERS),
  providerPostcardId: z.string().optional(),
  status: z.enum(POSTCARD_STATUSES),
  frontArtifactKey: z.string().min(1).optional(),
  backArtifactKey: z.string().min(1).optional(),
  renderedAt: IsoTimestampSchema.optional(),
  reviewedAt: IsoTimestampSchema.optional(),
  reviewedBy: z.string().min(1).optional(),
  submittedAt: IsoTimestampSchema.optional(),
  costCents: z.number().int().nonnegative().optional(),
  failureReason: z.string().min(1).optional(),
  mailedAt: IsoTimestampSchema.optional(),
  deliveredAt: IsoTimestampSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
