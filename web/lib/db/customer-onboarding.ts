import 'server-only';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { CustomerOnboarding } from '@/domain/models/customer-onboarding';
import { CustomerOnboardingSchema } from '@/domain/schemas/customer-onboarding.schema';
import { getDynamoDBClient, TABLE_CUSTOMER_ONBOARDING } from './client';

export async function getCustomerOnboardingByBusinessId(businessId: string): Promise<CustomerOnboarding | null> {
  const client = getDynamoDBClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_CUSTOMER_ONBOARDING(),
      Key: { businessId },
    }),
  );
  if (!result.Item) return null;
  return CustomerOnboardingSchema.parse(result.Item);
}

export async function putCustomerOnboarding(record: CustomerOnboarding): Promise<void> {
  CustomerOnboardingSchema.parse(record);
  const client = getDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_CUSTOMER_ONBOARDING(),
      Item: record,
    }),
  );
}

/**
 * Conditionally create the one-and-only onboarding record for a business.
 * Returns `false` (never throws) when a record already exists — matching
 * `revokeClaim`'s convention (`lib/db/claims.ts`) for a condition that's
 * expected to sometimes fail under normal concurrent operation (two
 * simultaneous first visits racing to create the same record).
 */
export async function createCustomerOnboardingRecord(record: CustomerOnboarding): Promise<boolean> {
  CustomerOnboardingSchema.parse(record);
  const client = getDynamoDBClient();
  try {
    await client.send(
      new PutCommand({
        TableName: TABLE_CUSTOMER_ONBOARDING(),
        Item: record,
        ConditionExpression: 'attribute_not_exists(businessId)',
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}
