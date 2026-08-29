import 'server-only';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { CustomerDomainProfile } from '@/domain/models/customer-domain-profile';
import { CustomerDomainProfileSchema } from '@/domain/schemas/customer-domain-profile.schema';
import { getDynamoDBClient, TABLE_CUSTOMER_DOMAIN_PROFILES } from './client';

/**
 * The canonical `userId → opensrsCustomerId` repository (OpenSRS Storefront
 * integration). See `domain/models/customer-domain-profile.ts` for the full
 * rationale — mirrors `lib/db/customer-billing.ts` exactly.
 */

export async function getCustomerDomainProfile(userId: string): Promise<CustomerDomainProfile | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_CUSTOMER_DOMAIN_PROFILES(),
      Key: { userId },
    }),
  );
  if (!result.Item) return null;
  return CustomerDomainProfileSchema.parse(result.Item);
}

export type CreateCustomerDomainProfileResult =
  /** This call created the row — the caller's freshly-created OpenSRS customer is the one to use. */
  | { outcome: 'created'; profile: CustomerDomainProfile }
  /** A concurrent request already won the race — the caller's freshly-created
   *  OpenSRS customer is a discarded, rare, low-cost orphan; the winner's
   *  profile (and its OpenSRS customer) is the one to actually use. */
  | { outcome: 'already_exists'; profile: CustomerDomainProfile };

/**
 * Conditionally creates the one-row-per-customer profile
 * (`attribute_not_exists(userId)`), making OpenSRS-customer creation atomic
 * per customer. On a lost race (two concurrent first-purchases for the same
 * customer across two different Businesses), re-reads and returns the
 * winning row rather than throwing — the caller discards the OpenSRS
 * customer it just created and reuses the winner's instead.
 */
export async function createCustomerDomainProfile(
  userId: string,
  opensrsCustomerId: string,
): Promise<CreateCustomerDomainProfileResult> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  const profile: CustomerDomainProfile = { userId, opensrsCustomerId, createdAt: now, updatedAt: now };
  CustomerDomainProfileSchema.parse(profile);

  try {
    await client.send(
      new PutCommand({
        TableName: TABLE_CUSTOMER_DOMAIN_PROFILES(),
        Item: profile,
        ConditionExpression: 'attribute_not_exists(userId)',
      }),
    );
    return { outcome: 'created', profile };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      const existing = await getCustomerDomainProfile(userId);
      if (!existing) throw err; // should be unreachable — the condition just failed because it exists
      return { outcome: 'already_exists', profile: existing };
    }
    throw err;
  }
}
