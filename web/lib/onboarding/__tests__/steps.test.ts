import { describe, it, expect } from 'vitest';
import { resolveEarliestIncompleteStep, canAccessOnboardingStep } from '@/lib/onboarding/steps';
import type { OnboardingCompletableStep } from '@/domain/models/customer-onboarding';

describe('resolveEarliestIncompleteStep', () => {
  it('returns welcome when nothing is completed', () => {
    expect(resolveEarliestIncompleteStep([])).toBe('welcome');
  });

  it('returns the next step in order, not just any missing step', () => {
    expect(resolveEarliestIncompleteStep(['welcome'])).toBe('review');
    expect(resolveEarliestIncompleteStep(['welcome', 'review'])).toBe('domain');
    expect(resolveEarliestIncompleteStep(['welcome', 'review', 'domain'])).toBe('publish');
    expect(resolveEarliestIncompleteStep(['welcome', 'review', 'domain', 'publish'])).toBe('tour');
  });

  it('is order-independent in the input array (still finds the earliest gap)', () => {
    expect(resolveEarliestIncompleteStep(['domain', 'welcome'] as OnboardingCompletableStep[])).toBe('review');
  });

  it('returns complete once every step is present', () => {
    expect(resolveEarliestIncompleteStep(['welcome', 'review', 'domain', 'publish', 'tour'])).toBe('complete');
  });
});

describe('canAccessOnboardingStep', () => {
  it('allows the earliest incomplete step itself', () => {
    expect(canAccessOnboardingStep(['welcome'], 'review')).toBe(true);
  });

  it('allows revisiting an already-completed step', () => {
    expect(canAccessOnboardingStep(['welcome', 'review'], 'welcome')).toBe(true);
  });

  it('blocks skipping ahead of the earliest incomplete step', () => {
    expect(canAccessOnboardingStep(['welcome'], 'domain')).toBe(false);
    expect(canAccessOnboardingStep([], 'publish')).toBe(false);
  });

  it('allows free navigation to any step once onboarding is fully complete', () => {
    const completed: OnboardingCompletableStep[] = ['welcome', 'review', 'domain', 'publish', 'tour'];
    expect(canAccessOnboardingStep(completed, 'welcome')).toBe(true);
    expect(canAccessOnboardingStep(completed, 'tour')).toBe(true);
  });
});
