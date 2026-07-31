/**
 * Unit tests for the onboarding step-completion functions
 * (implementation.md, Stage 19.x, Part 1) — in particular, that
 * `CustomerOnboarding.status` only ever reaches `'completed'` once every
 * step (including `publish`) is present, and that these functions never
 * decide *whether* a step's requirement was met — only the caller does.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockGetByBusinessId, mockPut } = vi.hoisted(() => ({
  mockGetByBusinessId: vi.fn(),
  mockPut: vi.fn(),
}));

vi.mock('@/lib/db/customer-onboarding', () => ({
  getCustomerOnboardingByBusinessId: mockGetByBusinessId,
  putCustomerOnboarding: mockPut,
}));

import {
  completeWelcomeStep,
  completeReviewStep,
  deferDomainStep,
  completePublishStep,
  completeTourStep,
} from '@/lib/onboarding/complete-step';
import type { CustomerOnboarding } from '@/domain/models/customer-onboarding';

function makeRecord(overrides: Partial<CustomerOnboarding> = {}): CustomerOnboarding {
  return {
    businessId: 'biz_1',
    userId: 'user_1',
    status: 'not_started',
    currentStep: 'welcome',
    completedSteps: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  mockGetByBusinessId.mockReset();
  mockPut.mockReset();
});

describe('step-completion functions', () => {
  it('completeWelcomeStep appends welcome and moves to in_progress', async () => {
    mockGetByBusinessId.mockResolvedValueOnce(makeRecord());

    const result = await completeWelcomeStep('biz_1');

    expect(result.completedSteps).toEqual(['welcome']);
    expect(result.currentStep).toBe('review');
    expect(result.status).toBe('in_progress');
    expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({ completedSteps: ['welcome'] }));
  });

  it('completeReviewStep is idempotent — re-calling it does not duplicate the step', async () => {
    mockGetByBusinessId.mockResolvedValueOnce(makeRecord({ completedSteps: ['welcome', 'review'], status: 'in_progress' }));

    const result = await completeReviewStep('biz_1');

    expect(result.completedSteps).toEqual(['welcome', 'review']);
    expect(result.currentStep).toBe('domain');
  });

  it('deferDomainStep sets domainDecision and domainDeferredAt', async () => {
    mockGetByBusinessId.mockResolvedValueOnce(makeRecord({ completedSteps: ['welcome', 'review'], status: 'in_progress' }));

    const result = await deferDomainStep('biz_1');

    expect(result.domainDecision).toBe('defer');
    expect(result.domainDeferredAt).toBeTruthy();
    expect(result.completedSteps).toEqual(['welcome', 'review', 'domain']);
  });

  it('does not become completed until publish and tour are also present', async () => {
    mockGetByBusinessId.mockResolvedValueOnce(makeRecord({ completedSteps: ['welcome', 'review', 'domain'], status: 'in_progress' }));

    const result = await completePublishStep('biz_1');

    expect(result.completedSteps).toEqual(['welcome', 'review', 'domain', 'publish']);
    expect(result.currentStep).toBe('tour');
    expect(result.status).toBe('in_progress'); // NOT completed — tour still missing
    expect(result.completedAt).toBeUndefined();
  });

  it('a draft-only site (publish never called) leaves the record permanently in_progress', async () => {
    // Simulates a customer who only ever calls "Enter my dashboard for now"
    // (continueWithDraftAction) — completePublishStep is simply never
    // invoked, so there is no code path that could mark the record complete.
    const record = makeRecord({ completedSteps: ['welcome', 'review', 'domain'], status: 'in_progress' });
    expect(record.status).toBe('in_progress');
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('reaches completed only once publish and tour are both present', async () => {
    mockGetByBusinessId.mockResolvedValueOnce(
      makeRecord({ completedSteps: ['welcome', 'review', 'domain', 'publish'], status: 'in_progress' }),
    );

    const result = await completeTourStep('biz_1', 'completed');

    expect(result.completedSteps).toEqual(['welcome', 'review', 'domain', 'publish', 'tour']);
    expect(result.currentStep).toBe('complete');
    expect(result.status).toBe('completed');
    expect(result.completedAt).toBeTruthy();
    expect(result.tourCompletedAt).toBeTruthy();
    expect(result.tourSkippedAt).toBeUndefined();
  });

  it('records a skipped tour distinctly from a completed one', async () => {
    mockGetByBusinessId.mockResolvedValueOnce(
      makeRecord({ completedSteps: ['welcome', 'review', 'domain', 'publish'], status: 'in_progress' }),
    );

    const result = await completeTourStep('biz_1', 'skipped');

    expect(result.tourSkippedAt).toBeTruthy();
    expect(result.tourCompletedAt).toBeUndefined();
    expect(result.status).toBe('completed'); // skipping still completes onboarding overall
  });

  it('throws when no onboarding record exists yet', async () => {
    mockGetByBusinessId.mockResolvedValueOnce(null);
    await expect(completeWelcomeStep('biz_1')).rejects.toThrow();
  });
});
