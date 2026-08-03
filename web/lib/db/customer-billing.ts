import 'server-only';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { CustomerBillingProfile } from '@/domain/models/customer-billing-profile';
import { CustomerBillingProfileSchema } from '@/domain/schemas/customer-billing-profile.schema';
import { getDynamoDBClient, TABLE_CUSTOMER_BILLING_PROFILES } from './client';

/**
 * The canonical `userId → stripeCustomerId` repository (Stage 18). See
 * `domain/models/customer-billing-profile.ts` for the full rationale.
 */

export async function getCustomerBillingProfile(userId: string): Promise<CustomerBillingProfile | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_CUSTOMER_BILLING_PROFILES(),
      Key: { userId },
    }),
  );
  if (!result.Item) return null;
  return CustomerBillingProfileSchema.parse(result.Item);
}

export type CreateCustomerBillingProfileResult =
  /** This call created the row — the caller's freshly-created Stripe Customer is the one to use. */
  | { outcome: 'created'; profile: CustomerBillingProfile }
  /** A concurrent request already won the race — the caller's freshly-created
   *  Stripe Customer is a discarded, rare, low-cost orphan; the winner's
   *  profile (and its Stripe Customer) is the one to actually use. */
  | { outcome: 'already_exists'; profile: CustomerBillingProfile };

/**
 * Conditionally creates the one-row-per-customer profile
 * (`attribute_not_exists(userId)`), making Stripe-Customer creation atomic
 * per customer. On a lost race (two concurrent first-checkouts for the same
 * customer across two different Businesses), re-reads and returns the
 * winning row rather than throwing — the caller discards the Stripe
 * Customer it just created and reuses the winner's instead.
 */
export async function createCustomerBillingProfile(
  userId: string,
  stripeCustomerId: string,
): Promise<CreateCustomerBillingProfileResult> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  const profile: CustomerBillingProfile = { userId, stripeCustomerId, createdAt: now, updatedAt: now };
  CustomerBillingProfileSchema.parse(profile);

  try {
    await client.send(
      new PutCommand({
        TableName: TABLE_CUSTOMER_BILLING_PROFILES(),
        Item: profile,
        ConditionExpression: 'attribute_not_exists(userId)',
      }),
    );
    return { outcome: 'created', profile };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      const existing = await getCustomerBillingProfile(userId);
      if (!existing) throw err; // should be unreachable — the condition just failed because it exists
      return { outcome: 'already_exists', profile: existing };
    }
    throw err;
  }
}

/**
 * Removes the `userId → stripeCustomerId` mapping row (Settings, Delete
 * Account). Deliberately does not touch the Stripe Customer object itself
 * — Stripe's own recommendation is against deleting customers with billing
 * history, and every subscription must already be canceled (via the
 * Stripe Customer Portal) before account deletion is permitted at all, so
 * nothing active is left behind; only this app's own foreign-key row is
 * removed. A no-op if the row doesn't exist (e.g. a customer who never
 * checked out).
 */
export async function deleteCustomerBillingProfile(userId: string): Promise<void> {
  const client = getDynamoDBClient();
  await client.send(
    new DeleteCommand({
      TableName: TABLE_CUSTOMER_BILLING_PROFILES(),
      Key: { userId },
    }),
  );
}
