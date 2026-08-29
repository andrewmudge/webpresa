import type { MutableTimestampedRecord } from './common';

/**
 * The canonical Cognito-`sub` → OpenSRS-Storefront-Customer mapping
 * (OpenSRS Storefront integration). Mirrors `CustomerBillingProfile`
 * exactly, for the same reason: one customer may own several Businesses
 * (Stage 17) and start a domain purchase from any of them, but they share
 * one OpenSRS Storefront customer account rather than minting a new one per
 * Business — this is what lets a customer land in Storefront via a one-time
 * SSO URL instead of ever seeing a second signup/login screen.
 *
 * Not a credential/identity table: Cognito remains the sole customer
 * directory. This record holds nothing but a domain-registrar-vendor
 * foreign key.
 *
 * Exactly one row per customer, ever — created once via a conditional
 * `PutItem` (`attribute_not_exists(userId)`, see
 * `lib/db/customer-domain-profiles.ts`) the first time that customer starts
 * a domain purchase for any Business.
 */
export interface CustomerDomainProfile extends MutableTimestampedRecord {
  /** Cognito `sub` — partition key. */
  userId: string;
  /** The one OpenSRS Storefront customer account this person's domain
   *  purchases are made under. */
  opensrsCustomerId: string;
}
