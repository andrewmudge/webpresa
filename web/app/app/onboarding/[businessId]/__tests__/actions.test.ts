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
} = vi.hoisted(() => ({
  mockRequireCustomerSession: vi.fn(),
  mockRequireActiveSubscription: vi.fn(),
  mockGetBusinessById: vi.fn(),
  mockListPreviewsForBusiness: vi.fn(),
  mockUpdateCustomerBusinessInfo: vi.fn(),
  mockCompleteReviewStep: vi.fn(),
  mockCompleteLeadsStep: vi.fn(),
  mockUpdateCustomerLeadNotificationEmail: vi.fn(),
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
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { completeReviewAction, completeLeadsAction } from '@/app/app/onboarding/[businessId]/actions';

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
