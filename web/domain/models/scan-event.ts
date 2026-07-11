import type { MutableTimestampedRecord } from './common';

// ---------------------------------------------------------------------------
// Status enum
// ---------------------------------------------------------------------------

export const SCAN_STATUSES = ['pending', 'running', 'completed', 'failed'] as const;
export type ScanStatus = (typeof SCAN_STATUSES)[number];

// ---------------------------------------------------------------------------
// Sub-types
// ---------------------------------------------------------------------------

/**
 * Quality scores produced by a scan run, each on a 0–100 scale.
 * A scan may produce any subset of these — all fields are optional.
 */
export interface ScanScores {
  overall?: number;
  design?: number;
  mobile?: number;
  seo?: number;
  performance?: number;
  accessibility?: number;
}

/**
 * Object-storage keys for artifacts captured during the scan.
 * Keys are opaque S3-compatible paths — the specific bucket is resolved
 * by the storage layer, not stored here.
 */
export interface ScanStorageKeys {
  screenshotKey?: string;
  htmlSnapshotKey?: string;
  lighthouseKey?: string;
}

// ---------------------------------------------------------------------------
// ScanEvent record
// ---------------------------------------------------------------------------

/**
 * A single website scan run triggered for a business.
 *
 * `startedAt` is set when the job begins processing.
 * `completedAt` is set (and `status` updated) when the run concludes,
 * whether successfully or with a failure.
 */
export interface ScanEvent extends MutableTimestampedRecord {
  /** Globally unique identifier.  Format: `scan_<uuid>` */
  scanId: string;
  businessId: string;
  status: ScanStatus;
  /** The URL that was scanned. */
  sourceUrl: string;
  storageKeys?: ScanStorageKeys;
  scores?: ScanScores;
  /** Human-readable reason populated only when status is `'failed'`. */
  failureReason?: string;
  /** ISO 8601 timestamp — set when the scan job starts executing. */
  startedAt: string;
  /** ISO 8601 timestamp — set when the scan job finishes (success or failure). */
  completedAt?: string;
}
