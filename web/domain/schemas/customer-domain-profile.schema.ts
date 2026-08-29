import { z } from 'zod';
import { IsoTimestampSchema } from './common.schema';

export const CustomerDomainProfileSchema = z.object({
  userId: z.string().min(1),
  opensrsCustomerId: z.string().min(1),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export type CustomerDomainProfileSchemaInput = z.input<typeof CustomerDomainProfileSchema>;
