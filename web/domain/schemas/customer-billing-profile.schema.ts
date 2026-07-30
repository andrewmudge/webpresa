import { z } from 'zod';
import { IsoTimestampSchema } from './common.schema';

export const CustomerBillingProfileSchema = z.object({
  userId: z.string().min(1),
  stripeCustomerId: z.string().min(1),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export type CustomerBillingProfileSchemaInput = z.input<typeof CustomerBillingProfileSchema>;
