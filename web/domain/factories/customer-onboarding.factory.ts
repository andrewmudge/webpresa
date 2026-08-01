import type { CustomerOnboarding } from '@/domain/models/customer-onboarding';
import { CustomerOnboardingSchema } from '@/domain/schemas/customer-onboarding.schema';
import { nowIso } from './utils';

export interface CreateCustomerOnboardingInput {
  businessId: string;
  userId: string;
}

/** Creates a fresh onboarding record in `'not_started'` status, `currentStep: 'review'` (the first step — see `ONBOARDING_COMPLETABLE_STEPS`). */
export function createCustomerOnboarding(input: CreateCustomerOnboardingInput): CustomerOnboarding {
  const now = nowIso();

  const record: CustomerOnboarding = {
    businessId: input.businessId,
    userId: input.userId,
    status: 'not_started',
    currentStep: 'review',
    completedSteps: [],
    createdAt: now,
    updatedAt: now,
  };

  CustomerOnboardingSchema.parse(record);
  return record;
}
