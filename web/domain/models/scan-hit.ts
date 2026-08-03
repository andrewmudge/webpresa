import type { TimestampedRecord } from './common';

// ---------------------------------------------------------------------------
// Device class enum
// ---------------------------------------------------------------------------

export const DEVICE_CLASSES = ['mobile', 'tablet', 'desktop', 'unknown'] as const;
export type DeviceClass = (typeof DEVICE_CLASSES)[number];

// ---------------------------------------------------------------------------
// ScanHit record
// ---------------------------------------------------------------------------

/**
 * A single, permanent record of one valid `/r/[campaignCode]` redirect
 * (Stage 21). Deliberately **not** named `ScanEvent` — that name already
 * belongs to the unrelated Firecrawl/Playwright/OpenAI scrape-and-score
 * record (`domain/models/scan-event.ts`); reusing it here would make every
 * future grep for either concept ambiguous.
 *
 * Every valid scan creates a new ScanHit — never an update to a prior one
 * (a plain `TimestampedRecord`, no `updatedAt`). Only the parent
 * `CampaignRecipient`'s rollup fields (`totalScans`/`estimatedUniqueScans`/
 * `lastScanAt`) are ever updated in place — see
 * `lib/db/campaign-recipients.ts`, `recordScanHitRollup`.
 *
 * `visitorFingerprint` backs the "estimated unique scans" rollup only — an
 * IP/UA-hash heuristic, never presented as exact (see implementation.md,
 * Stage 21, "Analytics").
 */
export interface ScanHit extends TimestampedRecord {
  /** DynamoDB table partition key. */
  campaignRecipientId: string;
  /** DynamoDB table sort key for this item shape: `HIT#<createdAt>#<random>`. */
  sortKey: string;
  /** Denormalized — avoids a join when displaying a hit. */
  campaignCode: string;
  /** Denormalized. */
  businessId: string;
  /** The URL actually redirected to at scan time — captures history even if the recipient's destination is changed later. */
  destinationUrl: string;
  /** SHA-256 hash used only for the uniqueness estimate; never the raw IP. */
  visitorFingerprint: string;
  userAgent: string;
  referrer?: string;
  deviceClass: DeviceClass;
  browserFamily?: string;
  operatingSystem?: string;
}
