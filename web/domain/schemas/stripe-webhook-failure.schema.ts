import { z } from 'zod';
import { IsoTimestampSchema } from './common.schema';

export const StripeWebhookFailureSchema = z.object({
  id: z.string().regex(/^stripefail_/),
  eventId: z.string().min(1).optional(),
  eventType: z.string().min(1).optional(),
  businessId: z.string().regex(/^biz_/).optional(),
  errorCategory: z.string().min(1),
  errorMessage: z.string().min(1).max(500),
  ttl: z.number().int().positive(),
  createdAt: IsoTimestampSchema,
});

export type StripeWebhookFailureSchemaInput = z.input<typeof StripeWebhookFailureSchema>;
