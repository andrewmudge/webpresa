import { z } from 'zod';
import { IsoTimestampSchema } from './common.schema';

export const MarketingSesEventSchema = z.object({
  snsMessageId: z.string().min(1),
  sesMessageId: z.string().min(1).optional(),
  eventType: z.string().min(1),
  receivedAt: IsoTimestampSchema,
  rawPayload: z.record(z.string(), z.unknown()),
  createdAt: IsoTimestampSchema,
});
