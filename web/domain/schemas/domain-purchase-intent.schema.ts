import { z } from 'zod';
import { DOMAIN_PURCHASE_INTENT_STATUSES } from '@/domain/models/domain-purchase-intent';
import { IsoTimestampSchema } from './common.schema';

export const DomainPurchaseIntentSchema = z.object({
  intentId: z.string().regex(/^dpi_/),
  businessId: z.string().regex(/^biz_/),
  userId: z.string().min(1),
  status: z.enum(DOMAIN_PURCHASE_INTENT_STATUSES),
  ttl: z.number().int().positive(),
  fulfilledAt: IsoTimestampSchema.optional(),
  domain: z.string().min(1).max(253).optional(),
  createdAt: IsoTimestampSchema,
});

export type DomainPurchaseIntentSchemaInput = z.input<typeof DomainPurchaseIntentSchema>;
