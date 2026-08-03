import type { MutableTimestampedRecord } from './common';

// ---------------------------------------------------------------------------
// Status enum
// ---------------------------------------------------------------------------

export const CAMPAIGN_RECIPIENT_STATUSES = ['active', 'disabled'] as const;
export type CampaignRecipientStatus = (typeof CAMPAIGN_RECIPIENT_STATUSES)[number];

// ---------------------------------------------------------------------------
// Destination discriminator
// ---------------------------------------------------------------------------

/**
 * `'claim'` (the default) — resolved at scan time by `/r/[campaignCode]`
 * through `claimId`, never a stored URL (the claim token itself is never
 * persisted in recoverable form — see `lib/claim/token.ts`). `'custom'` —
 * an explicit admin-supplied `destinationUrl`, the exception path.
 */
export const CAMPAIGN_RECIPIENT_DESTINATION_TYPES = ['claim', 'custom'] as const;
export type CampaignRecipientDestinationType = (typeof CAMPAIGN_RECIPIENT_DESTINATION_TYPES)[number];

// ---------------------------------------------------------------------------
// CampaignRecipient record
// ---------------------------------------------------------------------------

/**
 * One mailed (or otherwise distributed) piece within a Campaign (Stage 21) —
 * the attribution unit `ScanHit`s reference, never a `Campaign` or
 * `Business` directly. Each recipient owns its own opaque `campaignCode`
 * (what its QR code encodes), the destination that code resolves to, and
 * denormalized scan rollups.
 *
 * `status` is a per-recipient kill switch independent of the parent
 * Campaign's own `status` (e.g. one bad address in an otherwise-active
 * campaign) — see implementation.md, Stage 21, "Redirect behavior".
 *
 * `postcardId` is a forward-reference to a Stage 22 `Postcard`, once one
 * exists for this recipient — a `CampaignRecipient` never requires a
 * `Postcard` to exist (see implementation.md, Stage 21, "Relationship to
 * Postcard").
 */
export interface CampaignRecipient extends MutableTimestampedRecord {
  /** Globally unique identifier. Format: `recipient_<uuid>` */
  campaignRecipientId: string;
  campaignId: string;
  businessId: string;
  /** Opaque, unique, unguessable — see `lib/campaign/code.ts`. Never derived from any database identifier. */
  campaignCode: string;
  /** Default `'claim'` — see `CampaignRecipientDestinationType`. */
  destinationType: CampaignRecipientDestinationType;
  /**
   * Set only when `destinationType === 'claim'` — a plain internal record
   * reference (like `Claim.postcardId`), never a secret, never rendered
   * into any URL or QR. Absent means the business was already claimed when
   * this recipient was added (see `addCampaignRecipientAction`); the
   * redirect route then just links to the business's live page.
   */
  claimId?: string;
  /** Set only when `destinationType === 'custom'` — the full URL this recipient's QR code resolves to. Editable at any time without changing `campaignCode`. */
  destinationUrl?: string;
  /** Set only when `destinationType === 'custom'` — free-text admin note on what the destination is (e.g. "pricing page") — display only, never parsed or trusted. */
  destinationLabel?: string;
  status: CampaignRecipientStatus;
  postcardId?: string;
  /** Rollup — exact count, one increment per recorded ScanHit. */
  totalScans: number;
  /** Rollup — a fingerprint-based estimate, always labeled "estimated" in any UI that shows it. */
  estimatedUniqueScans: number;
  firstScanAt?: string;
  lastScanAt?: string;
}
