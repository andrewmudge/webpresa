/**
 * Unit tests for the `leads` onboarding step's slice of `actions.ts`:
 * `completeReviewAction` (always proceeds to the `leads` step — an earlier
 * auto-skip-when-business.email-is-set branch was removed 2026-08-29, since
 * a business's public contact email and its lead-notification address
 * aren't guaranteed to be the same), and `completeLeadsAction` itself.
 * Every DB/auth/editing dependency is mocked; `redirect` is mocked to throw
 * (Next's own behavior), matching the pattern used elsewhere in this
 * codebase for testing Server Actions that always redirect.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const {
  mockRequireCustomerSession,
  mockRequireActiveSubscription,
  mockGetBusinessById,
  mockListPreviewsForBusiness,
  mockUpdateCustomerBusinessInfo,
  mockCompleteReviewStep,
  mockCompleteLeadsStep,
  mockUpdateCustomerLeadNotificationEmail,
  mockGetCustomerDomainProfile,
  mockCreateCustomerDomainProfile,
  mockAdminGetCustomerProfileBySub,
  mockCreateStorefrontCustomer,
  mockGetStorefrontSsoUrl,
  mockDeriveStorefrontUsername,
  mockPutDomainPurchaseIntent,
} = vi.hoisted(() => ({
  mockRequireCustomerSession: vi.fn(),
  mockRequireActiveSubscription: vi.fn(),
  mockGetBusinessById: vi.fn(),
  mockListPreviewsForBusiness: vi.fn(),
  mockUpdateCustomerBusinessInfo: vi.fn(),
  mockCompleteReviewStep: vi.fn(),
  mockCompleteLeadsStep: vi.fn(),
  mockUpdateCustomerLeadNotificationEmail: vi.fn(),
  mockGetCustomerDomainProfile: vi.fn(),
  mockCreateCustomerDomainProfile: vi.fn(),
  mockAdminGetCustomerProfileBySub: vi.fn(),
  mockCreateStorefrontCustomer: vi.fn(),
  mockGetStorefrontSsoUrl: vi.fn(),
  mockDeriveStorefrontUsername: vi.fn(),
  mockPutDomainPurchaseIntent: vi.fn(),
}));

vi.mock('@/lib/auth/customer-authorization', () => ({
  requireCustomerSession: mockRequireCustomerSession,
  requireActiveSubscription: mockRequireActiveSubscription,
}));
vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById }));
vi.mock('@/lib/db/site-previews', () => ({ listPreviewsForBusiness: mockListPreviewsForBusiness }));
vi.mock('@/lib/customer-editing/business-info', () => ({ updateCustomerBusinessInfo: mockUpdateCustomerBusinessInfo }));
vi.mock('@/lib/customer-editing/section-content', () => ({ updateCustomerSectionContent: vi.fn() }));
vi.mock('@/lib/customer-editing/publish', () => ({ publishCustomerDraft: vi.fn() }));
vi.mock('@/lib/customer-editing/lead-notification-email', () => ({
  updateCustomerLeadNotificationEmail: mockUpdateCustomerLeadNotificationEmail,
}));
vi.mock('@/lib/onboarding/complete-step', () => ({
  completeReviewStep: mockCompleteReviewStep,
  completeLeadsStep: mockCompleteLeadsStep,
  deferDomainStep: vi.fn(),
  completeExistingDomainStep: vi.fn(),
  completePublishStep: vi.fn(),
  completeTourStep: vi.fn(),
}));
vi.mock('@/lib/domains/connect', () => ({ startDomainConnection: vi.fn() }));
vi.mock('@/lib/db/customer-domain-profiles', () => ({
  getCustomerDomainProfile: mockGetCustomerDomainProfile,
  createCustomerDomainProfile: mockCreateCustomerDomainProfile,
}));
vi.mock('@/lib/auth/customer-cognito', () => ({ adminGetCustomerProfileBySub: mockAdminGetCustomerProfileBySub }));
vi.mock('@/lib/db/domain-purchase-intents', () => ({ putDomainPurchaseIntent: mockPutDomainPurchaseIntent }));
vi.mock('@/domain/factories/domain-purchase-intent.factory', () => ({
  createDomainPurchaseIntent: (input: { businessId: string; userId: string; storefrontUsername: string }) => ({
    intentId: 'dpi_1',
    ...input,
    status: 'pending',
    ttl: 9999999999,
    createdAt: '2026-08-29T00:00:00.000Z',
  }),
}));
vi.mock('@/lib/opensrs/client', () => ({
  createStorefrontCustomer: mockCreateStorefrontCustomer,
  getStorefrontSsoUrl: mockGetStorefrontSsoUrl,
  deriveStorefrontUsername: mockDeriveStorefrontUsername,
}));
vi.mock('@/lib/opensrs/constants', () => ({ OPENSRS_DNS_TEMPLATE_ID: 'template_123' }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { completeReviewAction, completeLeadsAction, startDomainPurchaseAction } from '@/app/app/onboarding/[businessId]/actions';

const BUSINESS_ID = 'biz_1';

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireCustomerSession.mockResolvedValue({ sub: 'user_1' });
  mockRequireActiveSubscription.mockResolvedValue({ mode: 'full' });
  mockUpdateCustomerBusinessInfo.mockResolvedValue(undefined);
  mockListPreviewsForBusiness.mockResolvedValue([{ content: { services: [{ name: 'Drain cleaning' }] } }]);
  mockCompleteReviewStep.mockResolvedValue(undefined);
  mockCompleteLeadsStep.mockResolvedValue(undefined);
  mockUpdateCustomerLeadNotificationEmail.mockResolvedValue(undefined);
  mockRequireCustomerSession.mockResolvedValue({ sub: 'user_1', email: 'owner@acme.com' });
  mockDeriveStorefrontUsername.mockReturnValue('wpabc123');
  mockPutDomainPurchaseIntent.mockResolvedValue(undefined);
});

const BUSINESS_WITH_CONTACT_INFO = {
  businessId: BUSINESS_ID,
  address: { line1: '1 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
  phone: '+15125550100',
};

describe('startDomainPurchaseAction', () => {
  it('returns a generic error when the business is not found', async () => {
    mockGetBusinessById.mockResolvedValueOnce(null);

    const result = await startDomainPurchaseAction(BUSINESS_ID);

    expect(result.outcome).toBe('error');
  });

  it('returns a specific error when the business has no address/phone on file', async () => {
    mockGetBusinessById.mockResolvedValueOnce({ businessId: BUSINESS_ID, address: undefined, phone: undefined });

    const result = await startDomainPurchaseAction(BUSINESS_ID);

    expect(result).toEqual({ outcome: 'error', message: expect.stringContaining('Add a business address and phone number') });
    expect(mockCreateStorefrontCustomer).not.toHaveBeenCalled();
  });

  it('reuses an existing CustomerDomainProfile instead of creating a new OpenSRS customer', async () => {
    mockGetBusinessById.mockResolvedValueOnce(BUSINESS_WITH_CONTACT_INFO);
    mockGetCustomerDomainProfile.mockResolvedValueOnce({ userId: 'user_1', opensrsCustomerId: 'osrs_existing' });
    mockGetStorefrontSsoUrl.mockResolvedValueOnce({ url: 'https://webpresa.test.shopco.com/login?token=abc', expires_at: '2026-08-29T00:15:00.000Z' });

    const result = await startDomainPurchaseAction(BUSINESS_ID);

    expect(mockCreateStorefrontCustomer).not.toHaveBeenCalled();
    expect(mockGetStorefrontSsoUrl).toHaveBeenCalledWith('osrs_existing');
    expect(result).toEqual({
      outcome: 'redirect',
      url: 'https://webpresa.test.shopco.com/login?token=abc&dnstemplateid=template_123',
    });
  });

  it('creates a new OpenSRS customer from the business address/phone when no profile exists yet', async () => {
    mockGetBusinessById.mockResolvedValueOnce(BUSINESS_WITH_CONTACT_INFO);
    mockGetCustomerDomainProfile.mockResolvedValueOnce(null);
    mockAdminGetCustomerProfileBySub.mockResolvedValueOnce({ email: 'owner@acme.com', firstName: 'Jane', lastName: 'Doe' });
    mockCreateStorefrontCustomer.mockResolvedValueOnce('osrs_new');
    mockCreateCustomerDomainProfile.mockResolvedValueOnce({ outcome: 'created', profile: { userId: 'user_1', opensrsCustomerId: 'osrs_new' } });
    mockGetStorefrontSsoUrl.mockResolvedValueOnce({ url: 'https://webpresa.test.shopco.com/login?token=xyz', expires_at: '2026-08-29T00:15:00.000Z' });

    const result = await startDomainPurchaseAction(BUSINESS_ID);

    expect(mockCreateStorefrontCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'owner@acme.com',
        firstName: 'Jane',
        lastName: 'Doe',
        addressLine1: '1 Main St',
        city: 'Austin',
        state: 'TX',
        postalCode: '78701',
        country: 'US',
        phone: '+15125550100',
        externalUserId: 'user_1',
      }),
    );
    expect(result.outcome).toBe('redirect');
  });

  it('returns a generic error, never throwing, when the OpenSRS call fails', async () => {
    mockGetBusinessById.mockResolvedValueOnce(BUSINESS_WITH_CONTACT_INFO);
    mockGetCustomerDomainProfile.mockResolvedValueOnce({ userId: 'user_1', opensrsCustomerId: 'osrs_existing' });
    mockGetStorefrontSsoUrl.mockRejectedValueOnce(new Error('OpenSRS unavailable'));

    const result = await startDomainPurchaseAction(BUSINESS_ID);

    expect(result).toEqual({ outcome: 'error', message: expect.stringContaining('Unable to open the domain store') });
  });
});

describe('completeReviewAction', () => {
  it('always redirects to the leads step, even when business.email is already set', async () => {
    mockGetBusinessById.mockResolvedValueOnce({ phone: undefined, email: 'owner@acme.com' });

    await expect(completeReviewAction(BUSINESS_ID, formData({}))).rejects.toThrow(`REDIRECT:/app/onboarding/${BUSINESS_ID}/leads`);

    expect(mockUpdateCustomerLeadNotificationEmail).not.toHaveBeenCalled();
    expect(mockCompleteLeadsStep).not.toHaveBeenCalled();
  });

  it('redirects to the leads step when business.email is unset', async () => {
    mockGetBusinessById.mockResolvedValueOnce({ phone: '512-555-0100', email: undefined });

    await expect(completeReviewAction(BUSINESS_ID, formData({}))).rejects.toThrow(`REDIRECT:/app/onboarding/${BUSINESS_ID}/leads`);

    expect(mockUpdateCustomerLeadNotificationEmail).not.toHaveBeenCalled();
    expect(mockCompleteLeadsStep).not.toHaveBeenCalled();
  });
});

describe('completeLeadsAction', () => {
  it('saves the submitted email, completes the step, and redirects to domain', async () => {
    await expect(
      completeLeadsAction(BUSINESS_ID, formData({ leadNotificationEmail: 'leads@acme.com' })),
    ).rejects.toThrow(`REDIRECT:/app/onboarding/${BUSINESS_ID}/domain`);

    expect(mockUpdateCustomerLeadNotificationEmail).toHaveBeenCalledWith(BUSINESS_ID, 'leads@acme.com');
    expect(mockCompleteLeadsStep).toHaveBeenCalledWith(BUSINESS_ID);
  });

  it('redirects back with an error when the field is left blank', async () => {
    await expect(completeLeadsAction(BUSINESS_ID, formData({}))).rejects.toThrow(
      new RegExp(`^REDIRECT:/app/onboarding/${BUSINESS_ID}/leads\\?error=`),
    );
    expect(mockUpdateCustomerLeadNotificationEmail).not.toHaveBeenCalled();
    expect(mockCompleteLeadsStep).not.toHaveBeenCalled();
  });

  it('redirects back with an error when the email is invalid, without completing the step', async () => {
    mockUpdateCustomerLeadNotificationEmail.mockResolvedValueOnce({ message: 'Enter a valid email address' });

    await expect(completeLeadsAction(BUSINESS_ID, formData({ leadNotificationEmail: 'not-an-email' }))).rejects.toThrow(
      new RegExp(`^REDIRECT:/app/onboarding/${BUSINESS_ID}/leads\\?error=`),
    );
    expect(mockCompleteLeadsStep).not.toHaveBeenCalled();
  });
});
