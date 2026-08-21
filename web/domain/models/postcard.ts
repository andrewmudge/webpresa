import type { MutableTimestampedRecord } from './common';

// ---------------------------------------------------------------------------
// Status & provider enums
// ---------------------------------------------------------------------------

export const POSTCARD_STATUSES = ['pending', 'submitting', 'submitted', 'mailed', 'delivered', 'failed'] as const;
export type PostcardStatus = (typeof POSTCARD_STATUSES)[number];

export const POSTCARD_PROVIDERS = ['lob', 'stannp', 'postgrid'] as const;
export type PostcardProvider = (typeof POSTCARD_PROVIDERS)[number];

/**
 * Which front template a postcard uses — resolved per business (see
 * `resolvePostcardTemplateVariant` in `lib/postcards/template.ts`), never
 * per campaign, since a single campaign mixes businesses with and without
 * an existing website.
 */
export const POSTCARD_TEMPLATE_VARIANTS = ['has_website', 'no_website'] as const;
export type PostcardTemplateVariant = (typeof POSTCARD_TEMPLATE_VARIANTS)[number];

// ---------------------------------------------------------------------------
// Postcard record
// ---------------------------------------------------------------------------

/**
 * A physical postcard mailed to a business as part of the outreach campaign
 * (Stage 22).
 *
 * Does *not* own its own campaign code or QR destination — those belong to
 * the `CampaignRecipient` (Stage 21) referenced by `campaignRecipientId`,
 * which *is* "one mailed piece" in this model. A `Postcard` is the record of
 * that piece's physical rendering and fulfillment (provider, artifacts,
 * `mailedAt`, `deliveredAt`), not a second source of truth for its
 * destination. `campaignRecipientId` is absent for a single-postcard test
 * send with no associated campaign.
 *
 * Provider identifiers are stored only for status polling — no API keys
 * or credentials are stored on this record.
 */
export interface Postcard extends MutableTimestampedRecord {
  /** Globally unique identifier.  Format: `postcard_<uuid>` */
  postcardId: string;
  businessId: string;
  /** The SitePreview that was featured on this postcard. */
  previewId: string;
  /** The CampaignRecipient this postcard was generated for, if any. */
  campaignRecipientId?: string;
  /** Denormalized at creation time via `resolvePostcardTemplateVariant(business)`
   *  (`lib/postcards/template.ts`) — immune to the business's `websiteUrl`/
   *  `adminPostcardTemplateOverride` changing after this postcard was sent, so
   *  Stage 29 (Analytics) template-performance breakdowns stay stable against
   *  historical sends. Absent on postcards created before this field existed;
   *  callers needing a value for those fall back to calling
   *  `resolvePostcardTemplateVariant()` against current `Business` state. */
  templateVariant?: PostcardTemplateVariant;
  provider: PostcardProvider;
  /** The ID returned by the mailing provider after submission. */
  providerPostcardId?: string;
  status: PostcardStatus;

  // ── Rendering (Stage 22, Phase 2) ─────────────────────────────────────
  /** S3 key of the rendered front artifact — `postcards/{businessId}/{postcardId}/front.pdf`. Read by both the admin preview and the Lob submission call, so the two are always byte-identical. */
  frontArtifactKey?: string;
  /** S3 key of the rendered back artifact — `postcards/{businessId}/{postcardId}/back.pdf`. */
  backArtifactKey?: string;
  /** ISO 8601 timestamp — when the artifacts above were last (re)generated. */
  renderedAt?: string;

  // ── Administrative review (Stage 22, Phase 3) ─────────────────────────
  /** ISO 8601 timestamp — set when an admin explicitly approves this postcard for submission. Approval never triggers submission by itself. */
  reviewedAt?: string;
  reviewedBy?: string;

  // ── Submission (Stage 22, Phase 4) ────────────────────────────────────
  /** ISO 8601 timestamp — when the Lob API call actually succeeded. Distinct from `mailedAt`, which is provider-reported. */
  submittedAt?: string;
  /** Lob's quoted/actual cost for this postcard, in cents. */
  costCents?: number;
  /** Free text — populated when `status` is `'failed'`, from either a submission-time API error or a webhook-reported failure. */
  failureReason?: string;

  // ── Fulfillment (Stage 22, Phase 5 — reported by Lob, never guessed) ──
  /** ISO 8601 timestamp — set when the provider reports the card was mailed. */
  mailedAt?: string;
  /** ISO 8601 timestamp — set when the provider reports delivery. */
  deliveredAt?: string;
}
