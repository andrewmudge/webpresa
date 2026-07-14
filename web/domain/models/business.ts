import type { Industry } from '@/domain/constants/industries';
import type { BrandTone } from '@/domain/constants/brand-tone';
import type { Address, MutableTimestampedRecord } from './common';

// ---------------------------------------------------------------------------
// Status & source enums
// ---------------------------------------------------------------------------

export const BUSINESS_STATUSES = ['active', 'inactive', 'pending', 'archived'] as const;
export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

export const BUSINESS_SOURCES = ['scan', 'manual', 'import'] as const;
export type BusinessSource = (typeof BUSINESS_SOURCES)[number];

// ---------------------------------------------------------------------------
// Sub-types
// ---------------------------------------------------------------------------

/**
 * Website quality scores, each on a 0–100 scale.
 * All fields are optional; a scan may produce a subset of scores.
 */
export interface BusinessScores {
  overall?: number;
  design?: number;
  mobile?: number;
  seo?: number;
  performance?: number;
}

// ---------------------------------------------------------------------------
// Business record
// ---------------------------------------------------------------------------

/**
 * Canonical representation of a local business in the Webpresa system.
 *
 * A Business is intentionally valid without a `websiteUrl` (a new business
 * may not have one yet) and without a `googlePlaceId` (not all businesses
 * appear on Google Maps).
 */
export interface Business extends MutableTimestampedRecord {
  /** Globally unique identifier.  Format: `biz_<uuid>` */
  businessId: string;
  /** URL-safe slug derived from the business name. */
  slug: string;
  /** Public-facing trading name. */
  name: string;
  /** Legal entity name when it differs from the trading name. */
  legalName?: string;
  industry: Industry;
  phone?: string;
  email?: string;
  /**
   * Current live website URL — optional.
   * A Business is valid without a websiteUrl.
   */
  websiteUrl?: string;
  address?: Address;
  /**
   * Google Place identifier — optional.
   * A Business is valid without a googlePlaceId.
   */
  googlePlaceId?: string;
  googleMapsUrl?: string;
  /** How this record entered the system. */
  source: BusinessSource;
  status: BusinessStatus;
  scores?: BusinessScores;
  /** ID of the most recently published SitePreview for this business. */
  currentPreviewId?: string;
  /** Stripe Customer ID — stored for billing lookups only, never a secret. */
  stripeCustomerId?: string;
  /** Active Stripe Subscription ID. */
  stripeSubscriptionId?: string;

  // -------------------------------------------------------------------------
  // Website generation inputs (Stage 11)
  //
  // Free-text fields captured on the business creation/edit form and fed to
  // the AI generation prompt — never rendered directly, so they're kept as
  // plain multi-line strings rather than structured arrays. Persisted here
  // (not ephemeral) so an admin can revisit and re-run generation later
  // without re-entering data.
  // -------------------------------------------------------------------------

  /** Multi-line free text, one service per line. */
  servicesOffered?: string;
  /** Multi-line free text, one area per line. */
  serviceAreas?: string;
  description?: string;
  /** Multi-line free text. */
  differentiators?: string;
  brandTone?: BrandTone;
  notes?: string;

  // -------------------------------------------------------------------------
  // Uploaded assets (Stage 9 `businesses/` prefix)
  //
  // Both fields store the public `/api/assets/...` proxy URL, never a raw
  // S3 URL — the assets bucket is fully private.
  // -------------------------------------------------------------------------

  logoUrl?: string;
  photoUrls?: string[];
}
