/**
 * Shared base types reused across all domain records.
 */

/** A physical mailing / service address. */
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  /** State, province, or region. */
  state: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2 two-character country code (e.g. "US"). */
  country: string;
}

/**
 * A record that carries the timestamp of when it was first persisted.
 * All timestamps are ISO 8601 UTC strings (Z suffix).
 */
export interface TimestampedRecord {
  createdAt: string;
}

/**
 * A record that also tracks the last time any field was mutated.
 * Always update `updatedAt` together with the mutated field(s).
 */
export interface MutableTimestampedRecord extends TimestampedRecord {
  updatedAt: string;
}
