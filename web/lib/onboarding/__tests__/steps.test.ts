import { describe, it, expect } from 'vitest';
import { resolveEarliestIncompleteStep, canAccessOnboardingStep } from '@/lib/onboarding/steps';
import type { OnboardingCompletableStep } from '@/domain/models/customer-onboarding';

describe('resolveEarliestIncompleteStep', () => {
  it('returns review when nothing is completed', () => {
    expect(resolveEarliestIncompleteStep([])).toBe('review');
  });

  it('returns the next step in order, not just any missing step', () => {
    expect(resolveEarliestIncompleteStep(['review'])).toBe('domain');
    expect(resolveEarliestIncompleteStep(['review', 'domain'])).toBe('publish');
    expect(resolveEarliestIncompleteStep(['review', 'domain', 'publish'])).toBe('tour');
  });

  it('is order-independent in the input array (still finds the earliest gap)', () => {
    expect(resolveEarliestIncompleteStep(['domain'] as OnboardingCompletableStep[])).toBe('review');
  });

  it('returns complete once every step is present', () => {
    expect(resolveEarliestIncompleteStep(['review', 'domain', 'publish', 'tour'])).toBe('complete');
  });
});

describe('canAccessOnboardingStep', () => {
  it('allows the earliest incomplete step itself', () => {
    expect(canAccessOnboardingStep([], 'review')).toBe(true);
  });

  it('allows revisiting an already-completed step', () => {
    expect(canAccessOnboardingStep(['review', 'domain'], 'review')).toBe(true);
  });

  it('blocks skipping ahead of the earliest incomplete step', () => {
    expect(canAccessOnboardingStep(['review'], 'publish')).toBe(false);
    expect(canAccessOnboardingStep([], 'domain')).toBe(false);
  });

  it('allows free navigation to any step once onboarding is fully complete', () => {
    const completed: OnboardingCompletableStep[] = ['review', 'domain', 'publish', 'tour'];
    expect(canAccessOnboardingStep(completed, 'review')).toBe(true);
    expect(canAccessOnboardingStep(completed, 'tour')).toBe(true);
  });
});
