import { z } from 'zod';
import { IsoTimestampSchema } from './common.schema';

export const PostcardWebhookEventSchema = z.object({
  lobEventId: z.string().min(1),
  postcardId: z.string().regex(/^postcard_/),
  eventType: z.string().min(1),
  receivedAt: IsoTimestampSchema,
  rawPayload: z.record(z.string(), z.unknown()),
  mappedStatus: z.string().optional(),
  createdAt: IsoTimestampSchema,
});

export type PostcardWebhookEventSchemaInput = z.input<typeof PostcardWebhookEventSchema>;
