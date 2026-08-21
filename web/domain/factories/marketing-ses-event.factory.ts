import type { MarketingSesEvent } from '@/domain/models/marketing-ses-event';
import { MarketingSesEventSchema } from '@/domain/schemas/marketing-ses-event.schema';
import { nowIso } from './utils';

export interface CreateMarketingSesEventInput {
  snsMessageId: string;
  sesMessageId?: string;
  eventType: string;
  rawPayload: Record<string, unknown>;
}

export function createMarketingSesEvent(input: CreateMarketingSesEventInput): MarketingSesEvent {
  const now = nowIso();
  const record: MarketingSesEvent = {
    snsMessageId: input.snsMessageId,
    ...(input.sesMessageId !== undefined && { sesMessageId: input.sesMessageId }),
    eventType: input.eventType,
    receivedAt: now,
    rawPayload: input.rawPayload,
    createdAt: now,
  };
  MarketingSesEventSchema.parse(record);
  return record;
}
