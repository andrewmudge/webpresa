import 'server-only';
import type { CustomerOnboarding } from '@/domain/models/customer-onboarding';
import { createCustomerOnboarding } from '@/domain/factories/customer-onboarding.factory';
import { getCustomerOnboardingByBusinessId, createCustomerOnboardingRecord } from '@/lib/db/customer-onboarding';

/**
 * Get-or-create, matching `ensureDraftPreview`'s naming convention
 * (`lib/db/site-previews.ts`). A conditional create loses harmlessly to a
 * concurrent first visit — the loser just re-reads the winner's record
 * rather than erroring.
 */
export async function ensureCustomerOnboarding(businessId: string, userId: string): Promise<CustomerOnboarding> {
  const existing = await getCustomerOnboardingByBusinessId(businessId);
  if (existing) return existing;

  const record = createCustomerOnboarding({ businessId, userId });
  const created = await createCustomerOnboardingRecord(record);
  if (created) return record;

  const winner = await getCustomerOnboardingByBusinessId(businessId);
  if (!winner) {
    throw new Error(`Failed to create or read onboarding record for business ${businessId}`);
  }
  return winner;
}
