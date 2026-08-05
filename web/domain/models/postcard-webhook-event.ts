import type { TimestampedRecord } from './common';

/**
 * A single, permanent record of one received Lob webhook delivery (Stage
 * 22) — the durable half of the "durable event record + denormalized
 * rollup" split this repo uses throughout (see `ScanHit`/`CampaignRecipient`
 * in Stage 21). `Postcard.status`/`mailedAt`/`deliveredAt` are the rollup,
 * updated in place only when an event is newly recorded here.
 *
 * `lobEventId` is Lob's own globally-unique event id and this record's
 * DynamoDB partition key — a plain conditional `PutItem`
 * (`attribute_not_exists(lobEventId)`) is the entire dedup mechanism,
 * satisfying "duplicate webhook deliveries must not create duplicate
 * history entries." Never updated or deleted after creation (a plain
 * `TimestampedRecord`, no `updatedAt`) — webhook history must never
 * auto-expire or be overwritten.
 */
export interface PostcardWebhookEvent extends TimestampedRecord {
  /** DynamoDB table partition key — Lob's own event id. */
  lobEventId: string;
  postcardId: string;
  /** Lob's event type string (e.g. `postcard.mailed`, `postcard.delivered`) — enumerate the real set from Lob's current docs at implementation time. */
  eventType: string;
  /** ISO 8601 timestamp — when this webhook was received (also the sort key on `postcard-id-index`). */
  receivedAt: string;
  /** The verbatim webhook request body, stored for audit — "never delete history." */
  rawPayload: Record<string, unknown>;
  /** This event's mapped internal status, if it produced one — see `web/lib/lob/status-mapping.ts`. */
  mappedStatus?: string;
}
