import type { MutableTimestampedRecord } from './common';
import type { EmailSequence } from './email-template';

/**
 * One business's enrollment in one drip campaign. Created idempotently when
 * Lob reports `postcard.delivered` (`lib/marketing/campaign-start.ts`) — the
 * composite key (`businessId` + `marketingCampaignId`) is itself the
 * enroll-once guard via a conditional `PutItem`
 * (`attribute_not_exists(marketingCampaignId)`).
 *
 * Only the *next* scheduled step is ever tracked (`nextActionSequence`/
 * `nextActionAt`) — not all 3 upfront — mirroring this repo's existing
 * "single current-state pointer + separate append-only history" split
 * (`Postcard.status` vs. `PostcardWebhookEvent`). The append-only history
 * for this entity is the set of `MarketingMessage` rows keyed by the same
 * `businessId`.
 */
export const MARKETING_OUTREACH_STATUSES = ['active', 'paused', 'suppressed', 'completed', 'cancelled', 'failed'] as const;
export type MarketingOutreachStatus = (typeof MARKETING_OUTREACH_STATUSES)[number];

export interface MarketingOutreach extends MutableTimestampedRecord {
  businessId: string;
  marketingCampaignId: string;
  postcardId: string;
  /** Denormalized from `Postcard.campaignRecipientId` at enrollment — avoids a second lookup on every eligibility check. Absent for a business with no CampaignRecipient (a single-postcard test send). */
  campaignRecipientId?: string;
  /** Copied from `Postcard.deliveredAt` at enrollment — the scheduling anchor for every step (`computeNextActionAt`), never recomputed from "now" or a prior send's actual timestamp. */
  deliveredAt: string;
  status: MarketingOutreachStatus;
  /** Set when `status` transitions to `'suppressed'` — mirrors `MarketingSuppression.reason` for display without a second lookup. */
  suppressionReason?: string;
  /** The highest email sequence actually sent, or 0 before any send. */
  currentSequence: 0 | EmailSequence;
  /** The step due next, if `status === 'active'` and not yet completed. */
  nextActionSequence?: EmailSequence;
  /** ISO timestamp — when `nextActionSequence` becomes eligible to send. Sparse: only set while a step is pending, `REMOVE`d on completion/suppression/cancellation so the record drops out of the sparse `campaign-next-action-index` GSI automatically. */
  nextActionAt?: string;
  /** Per-sequence-step SES-failure retry counter, reset to 0 whenever `nextActionSequence` advances. */
  sendAttemptCount: number;
  /** Random, generated once at enrollment, reused unchanged across all 3 emails — plaintext, not hashed (see Marketing stage plan, "unsubscribe token" judgment call: low-stakes, must be re-embedded verbatim in 3 emails sent days apart). */
  unsubscribeToken: string;
  /** Denormalized rollup for the admin table's "last activity" column. */
  lastEventAt?: string;
  lastEventType?: string;
  /** Set only when `status === 'paused'` by an admin. */
  pauseReason?: string;
}
