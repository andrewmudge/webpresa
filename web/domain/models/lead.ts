import type { MutableTimestampedRecord } from './common';

// ---------------------------------------------------------------------------
// Status enums
// ---------------------------------------------------------------------------

/** The business owner's own inbox triage — independent of notification delivery. */
export const LEAD_STATUSES = ['new', 'read', 'archived'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Whether the owner-notification email was ever successfully delivered. */
export const LEAD_NOTIFICATION_STATUSES = ['pending', 'sent', 'failed'] as const;
export type LeadNotificationStatus = (typeof LEAD_NOTIFICATION_STATUSES)[number];

/** Single value today; a real enum leaves room for a future embeddable-widget source without a schema break. */
export const LEAD_SOURCES = ['request_service_form'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

// ---------------------------------------------------------------------------
// Lead record
// ---------------------------------------------------------------------------

/**
 * A visitor-submitted service request captured from a business's public
 * generated website (the "Request Service" modal — Stage 20). A Growth-plan-
 * only capability, see `hasPlanCapability` in `lib/auth/customer-authorization.ts`.
 *
 * `status` (owner inbox triage) and `notificationStatus` (SES delivery
 * outcome) are two independent lifecycles on one record, deliberately not
 * conflated — an owner archiving a lead has nothing to do with whether the
 * notification email ever sent.
 */
export interface Lead extends MutableTimestampedRecord {
  /** Globally unique identifier. Format: `lead_<uuid>` */
  leadId: string;
  businessId: string;
  /** The SitePreview rendering at submission time, for audit only — mirrors Claim.previewId. */
  previewId?: string;

  name: string;
  phone?: string;
  email?: string;
  serviceNeeded?: string;
  message?: string;

  source: LeadSource;
  status: LeadStatus;

  /** SHA-256 hash of the submitter's IP — never the raw address. Mirrors Claim's ipHash pattern. */
  submitterIpHash: string;
  /** Deduplication signature — see `computeFingerprint` (`lib/leads/spam-guard.ts`). */
  fingerprint: string;

  notificationStatus: LeadNotificationStatus;
  notificationAttempts: number;
  lastNotificationAttemptAt?: string;
  /** Diagnostics only — never rendered to the business owner, only to admin. */
  lastNotificationError?: string;

  archivedAt?: string;
}
