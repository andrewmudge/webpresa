/**
 * Unit tests for Settings' post-onboarding domain-management actions.
 * These mirror the onboarding domain step's actions
 * (`onboarding/[businessId]/__tests__/actions.test.ts`) against the same
 * underlying `lib/` functions, but every redirect target is the Settings
 * domain page, never the onboarding wizard.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const {
  mockRequireCustomerSession,
  mockRequireActiveSubscription,
  mockRequireBusinessOwnership,
  mockGetBusinessById,
  mockStartDomainConnection,
  mockDisconnectDomainConnectionForCustomer,
  mockGetCustomerDomainProfile,
  mockGetStorefrontSsoUrl,
} = vi.hoisted(() => ({
  mockRequireCustomerSession: vi.fn(),
  mockRequireActiveSubscription: vi.fn(),
  mockRequireBusinessOwnership: vi.fn(),
  mockGetBusinessById: vi.fn(),
  mockStartDomainConnection: vi.fn(),
  mockDisconnectDomainConnectionForCustomer: vi.fn(),
  mockGetCustomerDomainProfile: vi.fn(),
  mockGetStorefrontSsoUrl: vi.fn(),
}));

vi.mock('@/lib/auth/customer-authorization', () => ({
  requireCustomerSession: mockRequireCustomerSession,
  requireActiveSubscription: mockRequireActiveSubscription,
  requireBusinessOwnership: mockRequireBusinessOwnership,
}));
vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById }));
vi.mock('@/lib/domains/connect', () => ({ startDomainConnection: mockStartDomainConnection }));
vi.mock('@/lib/domains/disconnect', () => ({ disconnectDomainConnectionForCustomer: mockDisconnectDomainConnectionForCustomer }));
vi.mock('@/lib/db/customer-domain-profiles', () => ({ getCustomerDomainProfile: mockGetCustomerDomainProfile }));
vi.mock('@/lib/opensrs/client', () => ({ getStorefrontSsoUrl: mockGetStorefrontSsoUrl }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import {
  settingsDeferDomainAction,
  settingsConnectExistingDomainAction,
  settingsManageOpenSrsAccountAction,
  settingsDisconnectCurrentDomainAction,
} from '@/app/app/(dashboard)/businesses/[businessId]/settings/domain/actions';

const BUSINESS_ID = 'biz_1';
const SETTINGS_DOMAIN_PATH = `/app/businesses/${BUSINESS_ID}/settings/domain`;

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireCustomerSession.mockResolvedValue({ sub: 'user_1', email: 'owner@acme.com' });
  mockRequireActiveSubscription.mockResolvedValue({ mode: 'full' });
  mockRequireBusinessOwnership.mockResolvedValue({ businessId: BUSINESS_ID });
});

describe('settingsDeferDomainAction', () => {
  it('redirects back to the settings domain page', async () => {
    await expect(settingsDeferDomainAction(BUSINESS_ID)).rejects.toThrow(`REDIRECT:${SETTINGS_DOMAIN_PATH}`);
  });
});

describe('settingsConnectExistingDomainAction', () => {
  it('redirects with an error when no domain is entered', async () => {
    await expect(settingsConnectExistingDomainAction(BUSINESS_ID, formData({}))).rejects.toThrow(
      new RegExp(`^REDIRECT:${SETTINGS_DOMAIN_PATH}\\?error=`),
    );
    expect(mockStartDomainConnection).not.toHaveBeenCalled();
  });

  it('connects the domain and redirects to the settings domain page on success', async () => {
    mockGetBusinessById.mockResolvedValueOnce({ businessId: BUSINESS_ID, slug: 'coastal-plumbing' });
    mockStartDomainConnection.mockResolvedValueOnce({ outcome: 'connected', connection: {} });

    await expect(
      settingsConnectExistingDomainAction(BUSINESS_ID, formData({ domain: 'coastalplumbing.com' })),
    ).rejects.toThrow(`REDIRECT:${SETTINGS_DOMAIN_PATH}`);

    expect(mockStartDomainConnection).toHaveBeenCalledWith(
      expect.objectContaining({ businessId: BUSINESS_ID, ownerUserId: 'user_1', slug: 'coastal-plumbing', rawDomain: 'coastalplumbing.com' }),
    );
  });

  it('redirects with an error message when the connection attempt fails', async () => {
    mockGetBusinessById.mockResolvedValueOnce({ businessId: BUSINESS_ID, slug: 'coastal-plumbing' });
    mockStartDomainConnection.mockResolvedValueOnce({ outcome: 'already_assigned', message: 'That domain is already connected to another Webpresa website.' });

    await expect(
      settingsConnectExistingDomainAction(BUSINESS_ID, formData({ domain: 'coastalplumbing.com' })),
    ).rejects.toThrow(new RegExp(`^REDIRECT:${SETTINGS_DOMAIN_PATH}\\?error=`));
  });
});

describe('settingsManageOpenSrsAccountAction', () => {
  it('returns an error when the customer has no OpenSRS profile', async () => {
    mockGetCustomerDomainProfile.mockResolvedValueOnce(null);

    const result = await settingsManageOpenSrsAccountAction(BUSINESS_ID);

    expect(result.outcome).toBe('error');
    expect(mockGetStorefrontSsoUrl).not.toHaveBeenCalled();
  });

  it('returns a fresh SSO redirect URL for an existing profile', async () => {
    mockGetCustomerDomainProfile.mockResolvedValueOnce({ userId: 'user_1', opensrsCustomerId: 'osrs_1' });
    mockGetStorefrontSsoUrl.mockResolvedValueOnce({ url: 'https://webpresa.shopco.com/login?token=abc', expires_at: '2026-08-29T00:15:00.000Z' });

    const result = await settingsManageOpenSrsAccountAction(BUSINESS_ID);

    expect(mockGetStorefrontSsoUrl).toHaveBeenCalledWith('osrs_1');
    expect(result).toEqual({ outcome: 'redirect', url: 'https://webpresa.shopco.com/login?token=abc' });
  });

  it('returns a generic error, never throwing, when the SSO call fails', async () => {
    mockGetCustomerDomainProfile.mockResolvedValueOnce({ userId: 'user_1', opensrsCustomerId: 'osrs_1' });
    mockGetStorefrontSsoUrl.mockRejectedValueOnce(new Error('OpenSRS unavailable'));

    const result = await settingsManageOpenSrsAccountAction(BUSINESS_ID);

    expect(result.outcome).toBe('error');
  });
});

describe('settingsDisconnectCurrentDomainAction', () => {
  it('returns undefined on success', async () => {
    mockDisconnectDomainConnectionForCustomer.mockResolvedValueOnce({ disconnected: true });

    const result = await settingsDisconnectCurrentDomainAction(BUSINESS_ID);

    expect(result).toBeUndefined();
    expect(mockRequireBusinessOwnership).toHaveBeenCalledWith('user_1', BUSINESS_ID);
  });

  it('returns a message when there is nothing to disconnect', async () => {
    mockDisconnectDomainConnectionForCustomer.mockResolvedValueOnce({ disconnected: false, message: 'No domain connection to remove.' });

    const result = await settingsDisconnectCurrentDomainAction(BUSINESS_ID);

    expect(result).toEqual({ message: 'No domain connection to remove.' });
  });
});
