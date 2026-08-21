import type { TimestampedRecord } from './common';
import type { EmailSequence } from './email-template';

/**
 * A single click-through on one tracked link in one marketing email —
 * mirrors `ScanHit`'s relationship to `CampaignRecipient` (Stage 21):
 * durable per-event log, with rollup fields (`clickCount`, `firstClickAt`,
 * `lastClickAt`) denormalized onto the parent `MarketingMessage`. Recorded
 * by the `/e/[token]` click-tracking redirect (`lib/marketing/click-token.ts`).
 */
export interface MarketingClick extends TimestampedRecord {
  messageId: string;
  /** DynamoDB sort key — `` CLICK#<isoTimestamp>#<random> ``. */
  sortKey: string;
  /** Denormalized fields below — avoid a join back to `MarketingMessage` for display. */
  businessId: string;
  marketingCampaignId: string;
  emailSequence: EmailSequence;
  linkLabel: string;
  destinationUrl: string;
  clickedAt: string;
  userAgent?: string;
  /** Hashed, never a raw IP — matches this repo's existing `ipHash` convention (see `ScanHit`/rate-limit helpers). */
  ipHash?: string;
  referrer?: string;
}
