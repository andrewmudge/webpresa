import type { TimestampedRecord } from './common';

/**
 * A single, permanent record of one received SES event (via its SNS
 * Configuration Set event destination) — the durable half of the "durable
 * event record + denormalized rollup" split this repo uses throughout (see
 * `PostcardWebhookEvent`/`Postcard`, Stage 22). `MarketingMessage`'s
 * `sesEventStatus`/`deliveredAt`/`bouncedAt`/`complainedAt` are the rollup,
 * updated in place only when an event is newly recorded here.
 *
 * `snsMessageId` is the SNS envelope's own globally-unique `MessageId` and
 * this record's DynamoDB partition key — a plain conditional `PutItem`
 * (`attribute_not_exists(snsMessageId)`) is the entire dedup mechanism,
 * exactly mirroring `PostcardWebhookEvent.lobEventId`.
 */
export interface MarketingSesEvent extends TimestampedRecord {
  /** DynamoDB table partition key — the SNS envelope's own `MessageId`. */
  snsMessageId: string;
  /** SES's own `mail.messageId` — absent only for a malformed/unresolvable notification. */
  sesMessageId?: string;
  /** SES event type — e.g. `Send`, `Delivery`, `Bounce`, `Complaint`, `Reject`. */
  eventType: string;
  /** ISO 8601 timestamp — when this webhook was received (also the sort key on `ses-message-id-index`). */
  receivedAt: string;
  /** The verbatim parsed SES event payload, stored for audit. */
  rawPayload: Record<string, unknown>;
}
