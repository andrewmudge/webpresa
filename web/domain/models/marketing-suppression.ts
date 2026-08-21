import type { TimestampedRecord } from './common';

/**
 * A single email address that must never receive marketing email again —
 * unifies unsubscribe/hard-bounce/complaint/admin-suppression into one
 * `GetItem` checked before every send (`checkMarketingEligibility`).
 * Address-scoped, not enrollment-scoped (keyed on `emailNormalized`, not
 * `businessId`), so it stays correct automatically if a business is ever
 * enrolled in a second future campaign. Never deleted or automatically
 * re-subscribed — see `implementation.md`, Marketing stage, "Unsubscribe /
 * CAN-SPAM support".
 */
export const MARKETING_SUPPRESSION_REASONS = ['unsubscribed', 'hard_bounce', 'complaint', 'admin'] as const;
export type MarketingSuppressionReason = (typeof MARKETING_SUPPRESSION_REASONS)[number];

export interface MarketingSuppression extends TimestampedRecord {
  /** Lowercased, trimmed — the partition key. */
  emailNormalized: string;
  /** Denormalized, for admin display only — never used as a lookup key. */
  businessId?: string;
  reason: MarketingSuppressionReason;
  suppressedAt: string;
  /** Admin actorId — set only when `reason === 'admin'`. */
  suppressedBy?: string;
}
