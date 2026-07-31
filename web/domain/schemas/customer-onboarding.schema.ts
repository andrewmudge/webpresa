import { z } from 'zod';
import {
  ONBOARDING_STATUSES,
  ONBOARDING_STEPS,
  ONBOARDING_COMPLETABLE_STEPS,
  ONBOARDING_DOMAIN_DECISIONS,
} from '@/domain/models/customer-onboarding';
import { IsoTimestampSchema } from './common.schema';

export const CustomerOnboardingSchema = z.object({
  businessId: z.string().regex(/^biz_/),
  userId: z.string().min(1),
  status: z.enum(ONBOARDING_STATUSES),
  currentStep: z.enum(ONBOARDING_STEPS),
  completedSteps: z.array(z.enum(ONBOARDING_COMPLETABLE_STEPS)),
  domainDecision: z.enum(ONBOARDING_DOMAIN_DECISIONS).optional(),
  domainConnectionId: z.string().regex(/^domain_/).optional(),
  domainDeferredAt: IsoTimestampSchema.optional(),
  tourCompletedAt: IsoTimestampSchema.optional(),
  tourSkippedAt: IsoTimestampSchema.optional(),
  completedAt: IsoTimestampSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export type CustomerOnboardingSchemaInput = z.input<typeof CustomerOnboardingSchema>;
