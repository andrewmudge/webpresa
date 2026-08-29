import type { TimestampedRecord } from './common';

/**
 * A short-lived correlation record linking one OpenSRS Storefront SSO
 * redirect to the Business it was started for (OpenSRS Storefront
 * integration — see `lib/opensrs/client.ts`,
 * `app/api/webhooks/opensrs/route.ts`).
 *
 * Not keyed on `businessId`/`userId` — a customer may start more than one
 * domain purchase over time (for the same or different Businesses). The
 * original design correlated via a fresh id passed as Storefront's
 * `extuserid` query-string parameter, round-tripped through the webhook —
 * **confirmed wrong against a real PTE test delivery (2026-08-29): the
 * actual webhook payload carries no `external_user_id`/`extuserid` field at
 * all.** It does carry `username`, so this record is keyed for lookup by
 * `storefrontUsername` (a value deterministic per Cognito `sub` — see
 * `lib/opensrs/client.ts`'s `deriveStorefrontUsername`) instead: the webhook
 * looks up the most recent `'pending'` intent for that username via the
 * `storefront-username-index` GSI (sorted by `createdAt`) to resolve which
 * Business a purchase belongs to.
 *
 * `ttl` bounds this to Storefront's own documented session lifetime (its
 * query-string parameters stay active for 7 days) rather than accumulating
 * forever.
 */
export const DOMAIN_PURCHASE_INTENT_STATUSES = ['pending', 'fulfilled', 'expired'] as const;
export type DomainPurchaseIntentStatus = (typeof DOMAIN_PURCHASE_INTENT_STATUSES)[number];

export interface DomainPurchaseIntent extends TimestampedRecord {
  /** Partition key — random token. Format: `dpi_<uuid>`. No longer round-tripped through Storefront (see doc comment above) — kept as the record's own stable identity. */
  intentId: string;
  businessId: string;
  userId: string;
  /** GSI partition key (`storefront-username-index`) — see doc comment above for why this, not `userId`/`extuserid`, is the webhook's actual correlation key. */
  storefrontUsername: string;
  status: DomainPurchaseIntentStatus;
  /** Epoch seconds — DynamoDB TTL attribute, ~7 days out from creation (matches Storefront's own session lifetime). */
  ttl: number;
  fulfilledAt?: string;
  /** Set once fulfilled — the domain that was actually purchased, for diagnostics/audit. */
  domain?: string;
}
