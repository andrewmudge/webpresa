/**
 * Unit tests for `ensureCustomerOnboarding` — the conditional get-or-create
 * (implementation.md, Stage 19.x, Part 1), mirroring `ensureDraftPreview`'s
 * own test coverage for the same copy-on-write-style race.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockGetByBusinessId, mockCreateRecord } = vi.hoisted(() => ({
  mockGetByBusinessId: vi.fn(),
  mockCreateRecord: vi.fn(),
}));

vi.mock('@/lib/db/customer-onboarding', () => ({
  getCustomerOnboardingByBusinessId: mockGetByBusinessId,
  createCustomerOnboardingRecord: mockCreateRecord,
}));

import { ensureCustomerOnboarding } from '@/lib/onboarding/ensure';

beforeEach(() => {
  mockGetByBusinessId.mockReset();
  mockCreateRecord.mockReset();
});

describe('ensureCustomerOnboarding', () => {
  it('returns the existing record without attempting to create one', async () => {
    const existing = { businessId: 'biz_1', userId: 'user_1', status: 'in_progress' };
    mockGetByBusinessId.mockResolvedValueOnce(existing);

    const result = await ensureCustomerOnboarding('biz_1', 'user_1');

    expect(result).toBe(existing);
    expect(mockCreateRecord).not.toHaveBeenCalled();
  });

  it('creates a fresh record on a genuine first visit', async () => {
    mockGetByBusinessId.mockResolvedValueOnce(null);
    mockCreateRecord.mockResolvedValueOnce(true);

    const result = await ensureCustomerOnboarding('biz_1', 'user_1');

    expect(result.businessId).toBe('biz_1');
    expect(result.userId).toBe('user_1');
    expect(result.status).toBe('not_started');
    expect(result.currentStep).toBe('review');
    expect(result.completedSteps).toEqual([]);
  });

  it('re-reads the winner when a concurrent create loses the conditional-write race', async () => {
    const winner = { businessId: 'biz_1', userId: 'user_2', status: 'in_progress' };
    mockGetByBusinessId.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
    mockCreateRecord.mockResolvedValueOnce(false);

    const result = await ensureCustomerOnboarding('biz_1', 'user_1');

    expect(result).toBe(winner);
  });

  it('throws if the create loses the race and the re-read still finds nothing (should never happen in practice)', async () => {
    mockGetByBusinessId.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mockCreateRecord.mockResolvedValueOnce(false);

    await expect(ensureCustomerOnboarding('biz_1', 'user_1')).rejects.toThrow();
  });
});
