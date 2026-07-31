import 'server-only';
import { nowIso } from '@/domain/factories/utils';
import type { CustomerOnboarding, OnboardingCompletableStep } from '@/domain/models/customer-onboarding';
import { getCustomerOnboardingByBusinessId, putCustomerOnboarding } from '@/lib/db/customer-onboarding';
import { resolveEarliestIncompleteStep } from './steps';

/**
 * Step-completion rules (implementation.md, Stage 19.x, Part 1). Every
 * function here only ever appends a step and re-derives `currentStep`/
 * `status` — none of them decide *whether* a step's actual requirement was
 * met (business-field validation, a real published preview existing, etc.);
 * that's the caller's job, matching the split Stage 19 already draws
 * between "editing/publishing logic" and "progress bookkeeping".
 */

function addCompletedStep(record: CustomerOnboarding, step: OnboardingCompletableStep): CustomerOnboarding {
  const completedSteps = record.completedSteps.includes(step) ? record.completedSteps : [...record.completedSteps, step];
  const nextStep = resolveEarliestIncompleteStep(completedSteps);
  const now = nowIso();
  return {
    ...record,
    completedSteps,
    currentStep: nextStep,
    status: nextStep === 'complete' ? 'completed' : 'in_progress',
    completedAt: nextStep === 'complete' ? now : record.completedAt,
    updatedAt: now,
  };
}

async function requireExistingOnboarding(businessId: string): Promise<CustomerOnboarding> {
  const existing = await getCustomerOnboardingByBusinessId(businessId);
  if (!existing) {
    throw new Error(`No onboarding record for business ${businessId} — call ensureCustomerOnboarding first`);
  }
  return existing;
}

export async function completeWelcomeStep(businessId: string): Promise<CustomerOnboarding> {
  const existing = await requireExistingOnboarding(businessId);
  const updated = addCompletedStep(existing, 'welcome');
  await putCustomerOnboarding(updated);
  return updated;
}

export async function completeReviewStep(businessId: string): Promise<CustomerOnboarding> {
  const existing = await requireExistingOnboarding(businessId);
  const updated = addCompletedStep(existing, 'review');
  await putCustomerOnboarding(updated);
  return updated;
}

/** Part 1: the only way to complete the domain step is an explicit defer. Parts 2/3 add their own completion paths on this same step. */
export async function deferDomainStep(businessId: string): Promise<CustomerOnboarding> {
  const existing = await requireExistingOnboarding(businessId);
  const now = nowIso();
  const updated = addCompletedStep({ ...existing, domainDecision: 'defer', domainDeferredAt: now }, 'domain');
  await putCustomerOnboarding(updated);
  return updated;
}

/** Part 2: completes the domain step via a connecting/connected existing domain — the connection itself may still be `awaiting_dns`/`verifying`. */
export async function completeExistingDomainStep(businessId: string, domainConnectionId: string): Promise<CustomerOnboarding> {
  const existing = await requireExistingOnboarding(businessId);
  const updated = addCompletedStep({ ...existing, domainDecision: 'existing', domainConnectionId }, 'domain');
  await putCustomerOnboarding(updated);
  return updated;
}

/**
 * Caller must have already confirmed a real `published` preview exists —
 * this function never itself checks preview state. A draft-only site must
 * never mark this step (or therefore the whole record) complete — see
 * implementation.md, Stage 19.x, Part 1, "Step-completion rules".
 */
export async function completePublishStep(businessId: string): Promise<CustomerOnboarding> {
  const existing = await requireExistingOnboarding(businessId);
  const updated = addCompletedStep(existing, 'publish');
  await putCustomerOnboarding(updated);
  return updated;
}

export async function completeTourStep(businessId: string, outcome: 'completed' | 'skipped'): Promise<CustomerOnboarding> {
  const existing = await requireExistingOnboarding(businessId);
  const now = nowIso();
  const withOutcome: CustomerOnboarding =
    outcome === 'completed' ? { ...existing, tourCompletedAt: now } : { ...existing, tourSkippedAt: now };
  const updated = addCompletedStep(withOutcome, 'tour');
  await putCustomerOnboarding(updated);
  return updated;
}
