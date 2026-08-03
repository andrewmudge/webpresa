/**
 * Unit tests for customer authorization primitives, including the Stage 18
 * entitlement boundary (`requireBusinessAccess`/`requireActiveSubscription`).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockGetBusinessById, mockGetCustomerSession } = vi.hoisted(() => ({
  mockGetBusinessById: vi.fn(),
  mockGetCustomerSession: vi.fn(),
}));

vi.mock('@/lib/db/businesses', () => ({
  getBusinessById: mockGetBusinessById,
}));

vi.mock('@/lib/auth/customer-session', () => ({
  getCustomerSession: mockGetCustomerSession,
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND');
  }),
}));

import {
  requireBusinessOwnership,
  requireBusinessAccess,
  requireActiveSubscription,
  computeBusinessAccessMode,
  hasPlanCapability,
} from '@/lib/auth/customer-authorization';

function makeBusiness(overrides: Record<string, unknown> = {}) {
  return {
    businessId: 'biz_1',
    ownerUserId: 'user_1',
    ...overrides,
  };
}

beforeEach(() => {
  mockGetBusinessById.mockReset();
  mockGetCustomerSession.mockReset();
});

describe('requireBusinessOwnership', () => {
  it('returns the business when owned by the caller', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness());
    const business = await requireBusinessOwnership('user_1', 'biz_1');
    expect(business.businessId).toBe('biz_1');
  });

  it('404s when the business belongs to a different owner', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness({ ownerUserId: 'someone_else' }));
    await expect(requireBusinessOwnership('user_1', 'biz_1')).rejects.toThrow('NOT_FOUND');
  });

  it('404s when the business does not exist', async () => {
    mockGetBusinessById.mockResolvedValueOnce(null);
    await expect(requireBusinessOwnership('user_1', 'biz_1')).rejects.toThrow('NOT_FOUND');
  });
});

describe('requireBusinessAccess', () => {
  it('grants full access for an active subscription', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness({ subscriptionStatus: 'active', plan: 'growth' }));
    const result = await requireBusinessAccess('user_1', 'biz_1');
    expect(result).toEqual({ mode: 'full', plan: 'growth' });
  });

  it('grants full access when active with cancelAtPeriodEnd — still within the paid period, not a fourth state', async () => {
    mockGetBusinessById.mockResolvedValueOnce(
      makeBusiness({ subscriptionStatus: 'active', plan: 'basic', cancelAtPeriodEnd: true }),
    );
    const result = await requireBusinessAccess('user_1', 'biz_1');
    expect(result.mode).toBe('full');
  });

  it('grants billing_recovery (restricted) access for past_due', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness({ subscriptionStatus: 'past_due', plan: 'basic' }));
    const result = await requireBusinessAccess('user_1', 'biz_1');
    expect(result).toEqual({ mode: 'billing_recovery', plan: 'basic' });
  });

  it('grants no access for canceled', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness({ subscriptionStatus: 'canceled' }));
    const result = await requireBusinessAccess('user_1', 'biz_1');
    expect(result).toEqual({ mode: 'none' });
  });

  it('grants no access when never subscribed (subscriptionStatus unset)', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness());
    const result = await requireBusinessAccess('user_1', 'biz_1');
    expect(result).toEqual({ mode: 'none' });
  });

  it('never trusts ownerUserId alone — denies a non-owner regardless of subscriptionStatus', async () => {
    mockGetBusinessById.mockResolvedValueOnce(
      makeBusiness({ ownerUserId: 'someone_else', subscriptionStatus: 'active' }),
    );
    await expect(requireBusinessAccess('user_1', 'biz_1')).rejects.toThrow('NOT_FOUND');
  });
});

describe('computeBusinessAccessMode', () => {
  it('is the exact pure mapping requireBusinessAccess delegates to — full for active', () => {
    expect(computeBusinessAccessMode({ subscriptionStatus: 'active', plan: 'growth' })).toEqual({
      mode: 'full',
      plan: 'growth',
    });
  });

  it('billing_recovery for past_due', () => {
    expect(computeBusinessAccessMode({ subscriptionStatus: 'past_due', plan: 'basic' })).toEqual({
      mode: 'billing_recovery',
      plan: 'basic',
    });
  });

  it('none for canceled', () => {
    expect(computeBusinessAccessMode({ subscriptionStatus: 'canceled' })).toEqual({ mode: 'none' });
  });

  it('none when never subscribed', () => {
    expect(computeBusinessAccessMode({})).toEqual({ mode: 'none' });
  });

  it('takes no DynamoDB or session dependency — a pure function, callable from app/b/[slug]/page.tsx without any auth boundary', () => {
    // No mocks configured for this call at all — if this function reached
    // out to getBusinessById/getCustomerSession, it would throw.
    const result = computeBusinessAccessMode({ subscriptionStatus: 'active', plan: 'basic' });
    expect(result.mode).toBe('full');
  });
});

describe('hasPlanCapability — lead_capture (Stage 20)', () => {
  it('grants capability for a full-access Growth business', () => {
    expect(hasPlanCapability({ mode: 'full', plan: 'growth' }, 'lead_capture')).toBe(true);
  });

  it('denies capability for a full-access Basic business', () => {
    expect(hasPlanCapability({ mode: 'full', plan: 'basic' }, 'lead_capture')).toBe(false);
  });

  it('denies capability for a billing_recovery Growth business — past_due does not pass', () => {
    expect(hasPlanCapability({ mode: 'billing_recovery', plan: 'growth' }, 'lead_capture')).toBe(false);
  });

  it('denies capability for mode "none" regardless of plan', () => {
    expect(hasPlanCapability({ mode: 'none' }, 'lead_capture')).toBe(false);
  });

  it('takes no DynamoDB dependency — a pure function over an already-computed BusinessAccessResult', () => {
    // No mocks configured — if this reached out to getBusinessById, it would throw.
    expect(hasPlanCapability({ mode: 'full', plan: 'growth' }, 'lead_capture')).toBe(true);
  });
});

describe('requireActiveSubscription', () => {
  it('returns the result when mode is full', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness({ subscriptionStatus: 'active', plan: 'basic' }));
    const result = await requireActiveSubscription('user_1', 'biz_1');
    expect(result.mode).toBe('full');
  });

  it('redirects to plan selection when past_due (restricted, not full)', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness({ subscriptionStatus: 'past_due' }));
    await expect(requireActiveSubscription('user_1', 'biz_1')).rejects.toThrow('REDIRECT:/account/claim-status');
  });

  it('redirects to plan selection when canceled or never subscribed', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness({ subscriptionStatus: 'canceled' }));
    await expect(requireActiveSubscription('user_1', 'biz_1')).rejects.toThrow('REDIRECT:/account/claim-status');
  });
});
