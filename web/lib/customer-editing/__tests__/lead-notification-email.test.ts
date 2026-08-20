/**
 * Unit tests for `updateCustomerLeadNotificationEmail` (Settings →
 * Notifications card, and the `leads` onboarding step).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockUpdateBusiness } = vi.hoisted(() => ({
  mockUpdateBusiness: vi.fn(),
}));

vi.mock('@/lib/db/businesses', () => ({
  updateBusiness: mockUpdateBusiness,
}));

import { updateCustomerLeadNotificationEmail } from '@/lib/customer-editing/lead-notification-email';

beforeEach(() => {
  mockUpdateBusiness.mockReset();
  mockUpdateBusiness.mockResolvedValue(undefined);
});

describe('updateCustomerLeadNotificationEmail', () => {
  it('saves a valid email', async () => {
    const result = await updateCustomerLeadNotificationEmail('biz_1', 'owner@acme.com');
    expect(result).toBeUndefined();
    expect(mockUpdateBusiness).toHaveBeenCalledWith('biz_1', { leadNotificationEmail: 'owner@acme.com' });
  });

  it('rejects an invalid email without writing anything', async () => {
    const result = await updateCustomerLeadNotificationEmail('biz_1', 'not-an-email');
    expect(result?.message).toBeTruthy();
    expect(mockUpdateBusiness).not.toHaveBeenCalled();
  });

  it('rejects an empty string without writing anything', async () => {
    const result = await updateCustomerLeadNotificationEmail('biz_1', '');
    expect(result?.message).toBeTruthy();
    expect(mockUpdateBusiness).not.toHaveBeenCalled();
  });

  it('surfaces a failure message when the write itself throws', async () => {
    mockUpdateBusiness.mockRejectedValueOnce(new Error('dynamodb down'));
    const result = await updateCustomerLeadNotificationEmail('biz_1', 'owner@acme.com');
    expect(result?.message).toBe('Failed to save changes. Please try again.');
  });
});
