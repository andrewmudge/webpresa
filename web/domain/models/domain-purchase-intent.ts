import type { TimestampedRecord } from './common';

/**
 * A short-lived correlation record linking one OpenSRS Storefront SSO
 * redirect to the Business it was started for (OpenSRS Storefront
 * integration — see `lib/opensrs/client.ts`,
 * `app/api/webhooks/opensrs/route.ts`).
 *
 * Not keyed on `businessId`/`userId` — a customer may start more than one
 * domain purchase over time (for the same or different Businesses), and
 * Storefront's own `extuserid` query-string parameter is documented as a
 * single stable value stored directly on the Storefront customer record
 * (overwritten by whatever link was most recently followed), not a
 * per-purchase correlation id. This table repurposes `extuserid` as exactly
 * that instead: `intentId` is generated fresh for each SSO redirect and
 * passed as `extuserid`, so whichever event the OpenSRS webhook later
 * delivers can look up which Business/customer it belongs to — the
 * `CustomerDomainProfile` mapping already covers "which OpenSRS customer is
 * this person," so `extuserid`'s documented customer-linking purpose isn't
 * needed for that; this table is purely for business-level correlation.
 *
 * `ttl` bounds this to Storefront's own documented session lifetime (its
 * query-string parameters stay active for 7 days) rather than accumulating
 * forever.
 */
export const DOMAIN_PURCHASE_INTENT_STATUSES = ['pending', 'fulfilled', 'expired'] as const;
export type DomainPurchaseIntentStatus = (typeof DOMAIN_PURCHASE_INTENT_STATUSES)[number];

export interface DomainPurchaseIntent extends TimestampedRecord {
  /** Partition key — random token, round-tripped through Storefront's `extuserid` parameter. Format: `dpi_<uuid>` */
  intentId: string;
  businessId: string;
  userId: string;
  status: DomainPurchaseIntentStatus;
  /** Epoch seconds — DynamoDB TTL attribute, ~7 days out from creation (matches Storefront's own session lifetime). */
  ttl: number;
  fulfilledAt?: string;
  /** Set once fulfilled — the domain that was actually purchased, for diagnostics/audit. */
  domain?: string;
}
