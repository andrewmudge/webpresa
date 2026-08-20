/**
 * Unit tests for `updateLeadNotificationEmailActionCustomer` (Settings →
 * Notifications card). This file's parent module (`actions.ts`) imports a
 * large number of unrelated customer-editing functions — each is stubbed
 * with a trivial `vi.fn()` purely so the module can be imported; none of
 * them are exercised here (see the sibling `lead-notification-email.test.ts`
 * for real coverage of the validation/save logic this action delegates to).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const {
  mockRequireCustomerSession,
  mockRequireActiveSubscription,
  mockUpdateCustomerLeadNotificationEmail,
} = vi.hoisted(() => ({
  mockRequireCustomerSession: vi.fn(),
  mockRequireActiveSubscription: vi.fn(),
  mockUpdateCustomerLeadNotificationEmail: vi.fn(),
}));

vi.mock('@/lib/auth/customer-authorization', () => ({
  requireCustomerSession: mockRequireCustomerSession,
  requireActiveSubscription: mockRequireActiveSubscription,
  requireBusinessOwnership: vi.fn(),
}));
vi.mock('@/lib/auth/customer-session', () => ({ deleteCustomerSession: vi.fn() }));
vi.mock('@/lib/customer-editing/business-info', () => ({ updateCustomerBusinessInfo: vi.fn() }));
vi.mock('@/lib/customer-editing/theme', () => ({ updateCustomerTheme: vi.fn() }));
vi.mock('@/lib/customer-editing/cta', () => ({ updateCustomerCta: vi.fn() }));
vi.mock('@/lib/customer-editing/section-content', () => ({ updateCustomerSectionContent: vi.fn() }));
vi.mock('@/lib/customer-editing/seo', () => ({ updateCustomerSeo: vi.fn() }));
vi.mock('@/lib/customer-editing/business-list', () => ({
  updateCustomerBusinessListField: vi.fn(),
  toggleCustomerReviewVisibility: vi.fn(),
  reorderCustomerTestimonials: vi.fn(),
}));
vi.mock('@/lib/customer-editing/photos', () => ({
  addCustomerBusinessPhotos: vi.fn(),
  deleteCustomerBusinessPhoto: vi.fn(),
  updateCustomerHeroPhotoSlots: vi.fn(),
  updateCustomerAboutPhotoSlot: vi.fn(),
  updateCustomerWhyChooseUsPhotoSlot: vi.fn(),
  updateCustomerServicesPhotoSlot: vi.fn(),
  updateCustomerLogo: vi.fn(),
}));
vi.mock('@/lib/customer-editing/publish', () => ({ publishCustomerDraft: vi.fn() }));
vi.mock('@/lib/customer-editing/notification-preference', () => ({ updateCustomerDraftNoticePreference: vi.fn() }));
vi.mock('@/lib/customer-editing/lead-notification-email', () => ({
  updateCustomerLeadNotificationEmail: mockUpdateCustomerLeadNotificationEmail,
}));
vi.mock('@/lib/customer-editing/hours', () => ({ updateCustomerBusinessHours: vi.fn() }));
vi.mock('@/lib/customer-editing/account', () => ({ updateCustomerAccountProfile: vi.fn() }));
vi.mock('@/lib/customer-editing/delete-website', () => ({ deleteCustomerWebsite: vi.fn() }));
vi.mock('@/lib/customer-editing/delete-account', () => ({ deleteCustomerAccount: vi.fn() }));
vi.mock('@/lib/auth/customer-cognito', () => ({ requestCustomerPasswordReset: vi.fn() }));
vi.mock('@/lib/website-sections/persist', () => ({ persistWebsiteSections: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { updateLeadNotificationEmailActionCustomer } from '@/app/app/(dashboard)/businesses/[businessId]/actions';

const BUSINESS_ID = 'biz_1';

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireCustomerSession.mockResolvedValue({ sub: 'user_1' });
  mockRequireActiveSubscription.mockResolvedValue({ mode: 'full' });
});

describe('updateLeadNotificationEmailActionCustomer', () => {
  it('delegates to updateCustomerLeadNotificationEmail after checking edit access', async () => {
    mockUpdateCustomerLeadNotificationEmail.mockResolvedValueOnce(undefined);

    const result = await updateLeadNotificationEmailActionCustomer(BUSINESS_ID, 'leads@acme.com');

    expect(mockRequireCustomerSession).toHaveBeenCalled();
    expect(mockRequireActiveSubscription).toHaveBeenCalledWith('user_1', BUSINESS_ID);
    expect(mockUpdateCustomerLeadNotificationEmail).toHaveBeenCalledWith(BUSINESS_ID, 'leads@acme.com');
    expect(result).toBeUndefined();
  });

  it('surfaces a validation/save failure message without swallowing it', async () => {
    mockUpdateCustomerLeadNotificationEmail.mockResolvedValueOnce({ message: 'Enter a valid email address' });

    const result = await updateLeadNotificationEmailActionCustomer(BUSINESS_ID, 'not-an-email');

    expect(result).toEqual({ message: 'Enter a valid email address' });
  });
});
