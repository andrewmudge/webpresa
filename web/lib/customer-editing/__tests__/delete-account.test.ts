/**
 * Unit tests for `deleteCustomerAccount` (Settings, Danger Zone — whole-
 * account delete). Verifies the subscription-blocking rule, the
 * per-business cascade reuse, billing-profile cleanup, and Cognito-last
 * ordering.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const {
  mockGetBusinessesByOwnerUserId,
  mockDeleteCustomerWebsite,
  mockDeleteCustomerBillingProfile,
  mockDeleteCognitoUser,
} = vi.hoisted(() => ({
  mockGetBusinessesByOwnerUserId: vi.fn(),
  mockDeleteCustomerWebsite: vi.fn(),
  mockDeleteCustomerBillingProfile: vi.fn(),
  mockDeleteCognitoUser: vi.fn(),
}));

vi.mock('@/lib/db/businesses', () => ({
  getBusinessesByOwnerUserId: mockGetBusinessesByOwnerUserId,
}));
vi.mock('@/lib/db/customer-billing', () => ({
  deleteCustomerBillingProfile: mockDeleteCustomerBillingProfile,
}));
vi.mock('@/lib/auth/customer-cognito', () => ({
  deleteCustomerAccount: mockDeleteCognitoUser,
}));
vi.mock('../delete-website', () => ({
  deleteCustomerWebsite: mockDeleteCustomerWebsite,
}));

import { deleteCustomerAccount } from '@/lib/customer-editing/delete-account';

function makeBusiness(overrides: Record<string, unknown> = {}) {
  return {
    businessId: 'biz_1',
    name: 'Acme Plumbing',
    subscriptionStatus: undefined,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteCustomerWebsite.mockResolvedValue(undefined);
  mockDeleteCustomerBillingProfile.mockResolvedValue(undefined);
  mockDeleteCognitoUser.mockResolvedValue({ ok: true });
});

describe('deleteCustomerAccount', () => {
  it('blocks entirely when any owned business has an active subscription', async () => {
    mockGetBusinessesByOwnerUserId.mockResolvedValue([makeBusiness({ subscriptionStatus: 'active' })]);
    const result = await deleteCustomerAccount('sub_1');
    expect(result?.message).toContain('Acme Plumbing');
    expect(mockDeleteCustomerWebsite).not.toHaveBeenCalled();
    expect(mockDeleteCognitoUser).not.toHaveBeenCalled();
  });

  it('blocks entirely when any owned business is past_due', async () => {
    mockGetBusinessesByOwnerUserId.mockResolvedValue([makeBusiness({ subscriptionStatus: 'past_due' })]);
    const result = await deleteCustomerAccount('sub_1');
    expect(result?.message).toBeTruthy();
    expect(mockDeleteCustomerWebsite).not.toHaveBeenCalled();
  });

  it('allows deletion when every owned business is canceled or never subscribed', async () => {
    mockGetBusinessesByOwnerUserId.mockResolvedValue([
      makeBusiness({ businessId: 'biz_1', subscriptionStatus: 'canceled' }),
      makeBusiness({ businessId: 'biz_2', subscriptionStatus: undefined }),
    ]);

    const result = await deleteCustomerAccount('sub_1');

    expect(result).toBeUndefined();
    expect(mockDeleteCustomerWebsite).toHaveBeenCalledWith('biz_1', 'sub_1');
    expect(mockDeleteCustomerWebsite).toHaveBeenCalledWith('biz_2', 'sub_1');
    expect(mockDeleteCustomerBillingProfile).toHaveBeenCalledWith('sub_1');
    expect(mockDeleteCognitoUser).toHaveBeenCalledWith('sub_1');
  });

  it('stops and reports the failure if a per-business cascade fails, without deleting the Cognito user', async () => {
    mockGetBusinessesByOwnerUserId.mockResolvedValue([makeBusiness({ subscriptionStatus: 'canceled' })]);
    mockDeleteCustomerWebsite.mockResolvedValue({ message: 'S3 down' });

    const result = await deleteCustomerAccount('sub_1');

    expect(result?.message).toContain('Acme Plumbing');
    expect(mockDeleteCustomerBillingProfile).not.toHaveBeenCalled();
    expect(mockDeleteCognitoUser).not.toHaveBeenCalled();
  });

  it('reports a clear message when the Cognito delete fails after data is already gone', async () => {
    mockGetBusinessesByOwnerUserId.mockResolvedValue([]);
    mockDeleteCognitoUser.mockResolvedValue({ ok: false, reason: 'unknown' });

    const result = await deleteCustomerAccount('sub_1');

    expect(result?.message).toMatch(/contact support/i);
  });

  it('succeeds for a customer who owns no businesses at all', async () => {
    mockGetBusinessesByOwnerUserId.mockResolvedValue([]);
    const result = await deleteCustomerAccount('sub_1');
    expect(result).toBeUndefined();
    expect(mockDeleteCustomerWebsite).not.toHaveBeenCalled();
    expect(mockDeleteCustomerBillingProfile).toHaveBeenCalledWith('sub_1');
    expect(mockDeleteCognitoUser).toHaveBeenCalledWith('sub_1');
  });
});
