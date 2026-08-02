/**
 * Unit tests for `updateCustomerAccountProfile` (Settings, Account card).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockUpdateCustomerProfile } = vi.hoisted(() => ({
  mockUpdateCustomerProfile: vi.fn(),
}));

vi.mock('@/lib/auth/customer-cognito', () => ({
  updateCustomerProfile: mockUpdateCustomerProfile,
}));

import { updateCustomerAccountProfile } from '@/lib/customer-editing/account';

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  mockUpdateCustomerProfile.mockReset();
});

describe('updateCustomerAccountProfile', () => {
  it('rejects a blank first name', async () => {
    const result = await updateCustomerAccountProfile('cognito-sub-123', formData({ firstName: '', lastName: 'Doe' }));
    expect(result?.errors?.firstName).toBeTruthy();
    expect(mockUpdateCustomerProfile).not.toHaveBeenCalled();
  });

  it('rejects a malformed phone number', async () => {
    const result = await updateCustomerAccountProfile(
      'cognito-sub-123',
      formData({ firstName: 'Jane', lastName: 'Doe', phone: '123' }),
    );
    expect(result?.errors?.phone).toBeTruthy();
    expect(mockUpdateCustomerProfile).not.toHaveBeenCalled();
  });

  it('calls updateCustomerProfile with the session sub, never a client-supplied identity', async () => {
    mockUpdateCustomerProfile.mockResolvedValue({ ok: true });
    const result = await updateCustomerAccountProfile(
      'cognito-sub-123',
      formData({ firstName: 'Jane', lastName: 'Doe', phone: '5551234567' }),
    );
    expect(result).toBeUndefined();
    expect(mockUpdateCustomerProfile).toHaveBeenCalledWith('cognito-sub-123', {
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '5551234567',
    });
  });

  it('surfaces a generic error message on failure', async () => {
    mockUpdateCustomerProfile.mockResolvedValue({ ok: false, reason: 'unknown' });
    const result = await updateCustomerAccountProfile(
      'cognito-sub-123',
      formData({ firstName: 'Jane', lastName: 'Doe' }),
    );
    expect(result?.message).toBeTruthy();
  });
});
