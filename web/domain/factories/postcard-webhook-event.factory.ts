import type { PostcardWebhookEvent } from '@/domain/models/postcard-webhook-event';
import { PostcardWebhookEventSchema } from '@/domain/schemas/postcard-webhook-event.schema';
import { nowIso } from './utils';

export interface CreatePostcardWebhookEventInput {
  lobEventId: string;
  postcardId: string;
  eventType: string;
  rawPayload: Record<string, unknown>;
  mappedStatus?: string;
}

/**
 * Create a new, permanent PostcardWebhookEvent record for one received Lob
 * webhook delivery — never updated after creation (see
 * `domain/models/postcard-webhook-event.ts`).
 */
export function createPostcardWebhookEvent(input: CreatePostcardWebhookEventInput): PostcardWebhookEvent {
  const now = nowIso();

  const record: PostcardWebhookEvent = {
    lobEventId: input.lobEventId,
    postcardId: input.postcardId,
    eventType: input.eventType,
    receivedAt: now,
    rawPayload: input.rawPayload,
    ...(input.mappedStatus !== undefined && { mappedStatus: input.mappedStatus }),
    createdAt: now,
  };

  PostcardWebhookEventSchema.parse(record);
  return record;
}
