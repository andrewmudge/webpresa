import type { CustomerOnboarding } from '@/domain/models/customer-onboarding';
import { CustomerOnboardingSchema } from '@/domain/schemas/customer-onboarding.schema';
import { nowIso } from './utils';

export interface CreateCustomerOnboardingInput {
  businessId: string;
  userId: string;
}

/** Creates a fresh onboarding record in `'not_started'` status, `currentStep: 'welcome'`. */
export function createCustomerOnboarding(input: CreateCustomerOnboardingInput): CustomerOnboarding {
  const now = nowIso();

  const record: CustomerOnboarding = {
    businessId: input.businessId,
    userId: input.userId,
    status: 'not_started',
    currentStep: 'welcome',
    completedSteps: [],
    createdAt: now,
    updatedAt: now,
  };

  CustomerOnboardingSchema.parse(record);
  return record;
}
