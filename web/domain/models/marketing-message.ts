import type { MutableTimestampedRecord } from './common';
import type { EmailSequence } from './email-template';

/**
 * One send attempt (or eligibility-skip) for one business/campaign/sequence
 * step. The DynamoDB sort key (`` `${marketingCampaignId}#${emailSequence}` ``,
 * stored as `sortKey`) IS the send-once idempotency key — a conditional
 * `PutItem` (`attribute_not_exists(sortKey)`) is the entire dedup mechanism,
 * mirroring `PostcardWebhookEvent`'s `lobEventId` dedup.
 *
 * `subjectSnapshot`/`htmlBodySnapshot`/`textBodySnapshot` hold the actually
 * rendered content at send time — `EmailTemplate` itself is mutable
 * current-state only, so this snapshot is the durable, auditable record of
 * what a given business actually received (see `implementation.md`,
 * Marketing stage, "Template versioning").
 */
export const MARKETING_MESSAGE_OUTCOMES = ['sent', 'skipped', 'failed'] as const;
export type MarketingMessageOutcome = (typeof MARKETING_MESSAGE_OUTCOMES)[number];

export const MARKETING_SES_EVENT_STATUSES = ['sent', 'delivered', 'bounced', 'complained', 'rejected'] as const;
export type MarketingSesEventStatus = (typeof MARKETING_SES_EVENT_STATUSES)[number];

export interface MarketingMessage extends MutableTimestampedRecord {
  /** `mktgmsg_` + uuid — cross-referenced by click tokens and SES event correlation. */
  messageId: string;
  businessId: string;
  marketingCampaignId: string;
  emailSequence: EmailSequence;
  /** DynamoDB sort key — `` `${marketingCampaignId}#${emailSequence}` ``. */
  sortKey: string;
  outcome: MarketingMessageOutcome;
  /** Set only when `outcome === 'skipped'` — the `checkMarketingEligibility` failure reason. */
  skipReason?: string;
  /** Set only when `outcome === 'failed'` — the SES error name (never the raw provider error message). */
  failureReason?: string;
  attemptedAt: string;
  /** Set only when `outcome === 'sent'`. */
  sentAt?: string;
  subjectSnapshot?: string;
  htmlBodySnapshot?: string;
  textBodySnapshot?: string;
  /** The address this was actually sent to at send time — snapshotted for the same reason subject/body are: `Business.email`/`leadNotificationEmail` can change afterward, and the audit trail should reflect who it really went to, not who the business currently lists. Set only on `outcome === 'sent'`. */
  recipientEmail?: string;
  /** SES's own message id — set only on `outcome === 'sent'`; the SES webhook's correlation key via `ses-message-id-index`. */
  sesMessageId?: string;
  sesEventStatus?: MarketingSesEventStatus;
  deliveredAt?: string;
  bouncedAt?: string;
  complainedAt?: string;
  /** Denormalized rollup — see `MarketingClick`, the durable per-click log this is rolled up from. */
  clickCount: number;
  firstClickAt?: string;
  lastClickAt?: string;
}
