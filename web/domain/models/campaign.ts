import type { MutableTimestampedRecord } from './common';

// ---------------------------------------------------------------------------
// Channel & status enums
// ---------------------------------------------------------------------------

/** MVP only ever creates `'postcard'` campaigns; the field exists so a future channel doesn't require a schema change. */
export const CAMPAIGN_CHANNELS = ['postcard', 'other'] as const;
export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];

export const CAMPAIGN_STATUSES = ['active', 'paused', 'archived', 'expired'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

// ---------------------------------------------------------------------------
// Campaign record
// ---------------------------------------------------------------------------

/**
 * A marketing campaign (Stage 21) — deliberately not tied to any single
 * Business. A Campaign owns no QR code, destination, or scan data itself;
 * those belong to its `CampaignRecipient`s (`domain/models/campaign-recipient.ts`):
 *
 *   Campaign → CampaignRecipient → Business
 *                    ↓
 *                 ScanHit(s)
 *
 * A campaign may have exactly one recipient (manual MVP testing) or many
 * (a future automated mail batch) — nothing in this model, or anything that
 * reads it, assumes either. See implementation.md, Stage 21, "Design
 * principles" and "Future automation".
 */
export interface Campaign extends MutableTimestampedRecord {
  /** Globally unique identifier. Format: `campaign_<uuid>` */
  campaignId: string;
  /** Admin-facing label. */
  name: string;
  channel: CampaignChannel;
  /** Controls whether ANY of this campaign's recipients' codes resolve — see `/r/[campaignCode]`. */
  status: CampaignStatus;
  /** Informational only in Stage 21 — not enforced automatically; an admin transitions `status` to `'expired'` manually. */
  expiresAt?: string;
}
