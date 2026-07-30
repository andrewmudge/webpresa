import type { MutableTimestampedRecord } from './common';

/**
 * The canonical Cognito-`sub` → Stripe-Customer mapping (Stage 18).
 *
 * One customer may own several Businesses (Stage 17), and each subscribes
 * independently, but they share one Stripe Customer rather than minting a
 * new one per Business. This is not a "billing account"/organization
 * concept — it carries no seats, roles, or team semantics, only a single
 * foreign key — and it exists because deriving Stripe-Customer reuse by
 * scanning a customer's other owned Businesses has no atomic "does one
 * already exist" check and risks creating two Stripe Customers for one
 * person under concurrent first-checkouts.
 *
 * Not a credential/identity table: Cognito remains the sole customer
 * directory. This record holds nothing but a billing-vendor foreign key.
 *
 * Exactly one row per customer, ever — created once via a conditional
 * `PutItem` (`attribute_not_exists(userId)`, see `lib/db/customer-billing.ts`)
 * the first time that customer completes Checkout for any Business.
 */
export interface CustomerBillingProfile extends MutableTimestampedRecord {
  /** Cognito `sub` — partition key. */
  userId: string;
  /** The one Stripe Customer this person's website subscriptions (and any
   *  future one-time domain purchase/renewal charges) are billed under. */
  stripeCustomerId: string;
}
