import type { MutableTimestampedRecord } from './common';

// ---------------------------------------------------------------------------
// Status & provider enums
// ---------------------------------------------------------------------------

export const POSTCARD_STATUSES = ['pending', 'submitted', 'mailed', 'delivered', 'failed'] as const;
export type PostcardStatus = (typeof POSTCARD_STATUSES)[number];

export const POSTCARD_PROVIDERS = ['lob', 'stannp', 'postgrid'] as const;
export type PostcardProvider = (typeof POSTCARD_PROVIDERS)[number];

// ---------------------------------------------------------------------------
// Postcard record
// ---------------------------------------------------------------------------

/**
 * A physical postcard mailed to a business as part of the outreach campaign.
 *
 * The postcard carries a QR code (`qrDestination`) that deep-links the
 * recipient to their specific preview page.
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
  provider: PostcardProvider;
  /** The ID returned by the mailing provider after submission. */
  providerPostcardId?: string;
  /** Internal campaign identifier for attribution and analytics. */
  campaignCode: string;
  /** Full URL the QR code resolves to. */
  qrDestination: string;
  status: PostcardStatus;
  /** ISO 8601 timestamp — set when the provider reports the card was mailed. */
  mailedAt?: string;
  /** ISO 8601 timestamp — set when the provider reports delivery. */
  deliveredAt?: string;
}
