/**
 * Unit tests for Checkout-session and Billing Portal Server Actions (Stage 18).
 * All Stripe SDK and DynamoDB interactions are mocked — no real network calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND');
  }),
}));

const {
  mockRequireCustomerSession,
  mockRequireBusinessOwnership,
  mockUpdateBusiness,
  mockGetCustomerBillingProfile,
  mockCreateCustomerBillingProfile,
  mockListClaimsForBusiness,
  mockCustomersCreate,
  mockCheckoutSessionsCreate,
  mockCheckoutSessionsRetrieve,
  mockPortalSessionsCreate,
} = vi.hoisted(() => ({
  mockRequireCustomerSession: vi.fn(),
  mockRequireBusinessOwnership: vi.fn(),
  mockUpdateBusiness: vi.fn(),
  mockGetCustomerBillingProfile: vi.fn(),
  mockCreateCustomerBillingProfile: vi.fn(),
  mockListClaimsForBusiness: vi.fn(),
  mockCustomersCreate: vi.fn(),
  mockCheckoutSessionsCreate: vi.fn(),
  mockCheckoutSessionsRetrieve: vi.fn(),
  mockPortalSessionsCreate: vi.fn(),
}));

vi.mock('@/lib/auth/customer-authorization', () => ({
  requireCustomerSession: mockRequireCustomerSession,
  requireBusinessOwnership: mockRequireBusinessOwnership,
}));

vi.mock('@/lib/db/businesses', () => ({
  updateBusiness: mockUpdateBusiness,
}));

vi.mock('@/lib/db/customer-billing', () => ({
  getCustomerBillingProfile: mockGetCustomerBillingProfile,
  createCustomerBillingProfile: mockCreateCustomerBillingProfile,
}));

vi.mock('@/lib/db/claims', () => ({
  listClaimsForBusiness: mockListClaimsForBusiness,
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripeClient: vi.fn(async () => ({
    customers: { create: mockCustomersCreate },
    checkout: { sessions: { create: mockCheckoutSessionsCreate, retrieve: mockCheckoutSessionsRetrieve } },
    billingPortal: { sessions: { create: mockPortalSessionsCreate } },
  })),
}));

import { createCheckoutSessionAction, createBillingPortalSessionAction } from '@/app/account/checkout/actions';

const SESSION = { sub: 'user_1', email: 'owner@example.test', expiresAt: '2099-01-01T00:00:00.000Z' };

function formDataFor(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  // Reset each mock's queued .mockResolvedValueOnce() implementations
  // individually (clearAllMocks alone doesn't drop those, and several tests
  // return early before ever calling requireBusinessOwnership/Stripe, which
  // would otherwise leave a stale queued value to bleed into a later test).
  // Deliberately NOT resetting the next/navigation mock — its throw
  // implementation is a permanent (non-"once") behavior set once above.
  mockRequireCustomerSession.mockReset();
  mockRequireBusinessOwnership.mockReset();
  mockUpdateBusiness.mockReset();
  mockGetCustomerBillingProfile.mockReset();
  mockCreateCustomerBillingProfile.mockReset();
  mockListClaimsForBusiness.mockReset();
  mockCustomersCreate.mockReset();
  mockCheckoutSessionsCreate.mockReset();
  mockCheckoutSessionsRetrieve.mockReset();
  mockPortalSessionsCreate.mockReset();
  process.env.WEBPRESA_APP_BASE_URL = 'https://app.example.test';
  process.env.STRIPE_PRICE_ID_BASIC = 'price_basic_test';
  process.env.STRIPE_PRICE_ID_GROWTH = 'price_growth_test';
  mockRequireCustomerSession.mockResolvedValue(SESSION);
});

describe('createCheckoutSessionAction', () => {
  it('rejects a missing plan before any Stripe call', async () => {
    mockRequireBusinessOwnership.mockResolvedValueOnce({ businessId: 'biz_1' });
    const result = await createCheckoutSessionAction(undefined, formDataFor({ businessId: 'biz_1', agreeToTerms: 'on' }));
    expect(result).toEqual({ error: 'Choose a plan.' });
    expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
  });

  it('rejects an arbitrary/unrecognized plan value — never reaches Stripe with it', async () => {
    mockRequireBusinessOwnership.mockResolvedValueOnce({ businessId: 'biz_1' });
    const result = await createCheckoutSessionAction(
      undefined,
      formDataFor({ businessId: 'biz_1', plan: 'enterprise', agreeToTerms: 'on' }),
    );
    expect(result).toEqual({ error: 'Choose a plan.' });
    expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
  });

  it('requires agreeing to terms before Checkout can be created', async () => {
    mockRequireBusinessOwnership.mockResolvedValueOnce({ businessId: 'biz_1' });
    const result = await createCheckoutSessionAction(undefined, formDataFor({ businessId: 'biz_1', plan: 'basic' }));
    expect(result?.error).toMatch(/agree/i);
    expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
  });

  it('redirects to the Customer Portal instead of creating a new Session when already active', async () => {
    mockRequireBusinessOwnership.mockResolvedValueOnce({ businessId: 'biz_1', subscriptionStatus: 'active' });
    mockGetCustomerBillingProfile.mockResolvedValueOnce({ userId: 'user_1', stripeCustomerId: 'cus_1' });
    mockPortalSessionsCreate.mockResolvedValueOnce({ url: 'https://billing.stripe.test/portal_1' });

    await expect(
      createCheckoutSessionAction(undefined, formDataFor({ businessId: 'biz_1', plan: 'basic', agreeToTerms: 'on' })),
    ).rejects.toThrow('REDIRECT:https://billing.stripe.test/portal_1');

    expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
  });

  it('redirects to the Customer Portal instead of creating a new Session when past_due', async () => {
    mockRequireBusinessOwnership.mockResolvedValueOnce({ businessId: 'biz_1', subscriptionStatus: 'past_due' });
    mockGetCustomerBillingProfile.mockResolvedValueOnce({ userId: 'user_1', stripeCustomerId: 'cus_1' });
    mockPortalSessionsCreate.mockResolvedValueOnce({ url: 'https://billing.stripe.test/portal_1' });

    await expect(
      createCheckoutSessionAction(undefined, formDataFor({ businessId: 'biz_1', plan: 'basic', agreeToTerms: 'on' })),
    ).rejects.toThrow('REDIRECT:https://billing.stripe.test/portal_1');

    expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
  });

  it('reuses a still-open pending Checkout Session instead of creating a new one', async () => {
    mockRequireBusinessOwnership.mockResolvedValueOnce({
      businessId: 'biz_1',
      pendingCheckoutSessionId: 'cs_pending_1',
    });
    mockCheckoutSessionsRetrieve.mockResolvedValueOnce({ status: 'open', url: 'https://checkout.stripe.test/cs_pending_1' });

    await expect(
      createCheckoutSessionAction(undefined, formDataFor({ businessId: 'biz_1', plan: 'basic', agreeToTerms: 'on' })),
    ).rejects.toThrow('REDIRECT:https://checkout.stripe.test/cs_pending_1');

    expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
  });

  it('creates a new Stripe Customer and a fresh Checkout Session for a first-time customer', async () => {
    mockRequireBusinessOwnership.mockResolvedValueOnce({ businessId: 'biz_1' });
    mockGetCustomerBillingProfile.mockResolvedValueOnce(null);
    mockCustomersCreate.mockResolvedValueOnce({ id: 'cus_new' });
    mockCreateCustomerBillingProfile.mockResolvedValueOnce({
      outcome: 'created',
      profile: { userId: 'user_1', stripeCustomerId: 'cus_new' },
    });
    mockListClaimsForBusiness.mockResolvedValueOnce([]);
    mockCheckoutSessionsCreate.mockResolvedValueOnce({
      id: 'cs_new',
      url: 'https://checkout.stripe.test/cs_new',
      expires_at: 1893456000,
    });

    await expect(
      createCheckoutSessionAction(undefined, formDataFor({ businessId: 'biz_1', plan: 'growth', agreeToTerms: 'on' })),
    ).rejects.toThrow('REDIRECT:https://checkout.stripe.test/cs_new');

    expect(mockCustomersCreate).toHaveBeenCalledWith({ email: SESSION.email, metadata: { ownerUserId: 'user_1' } });

    const [createArgs, createOptions] = mockCheckoutSessionsCreate.mock.calls[0];
    expect(createArgs.customer).toBe('cus_new');
    expect(typeof createOptions.idempotencyKey).toBe('string');
    expect(createArgs.line_items).toEqual([{ price: 'price_growth_test', quantity: 1 }]);
    expect(createArgs.metadata).toMatchObject({ businessId: 'biz_1', plan: 'growth', billingPurpose: 'website_subscription' });

    expect(mockUpdateBusiness).toHaveBeenCalledWith(
      'biz_1',
      expect.objectContaining({ stripeCustomerId: 'cus_new', pendingCheckoutSessionId: 'cs_new' }),
    );
  });

  it('reuses an existing CustomerBillingProfile rather than creating a second Stripe Customer', async () => {
    mockRequireBusinessOwnership.mockResolvedValueOnce({ businessId: 'biz_2' });
    mockGetCustomerBillingProfile.mockResolvedValueOnce({ userId: 'user_1', stripeCustomerId: 'cus_existing' });
    mockListClaimsForBusiness.mockResolvedValueOnce([]);
    mockCheckoutSessionsCreate.mockResolvedValueOnce({
      id: 'cs_new_2',
      url: 'https://checkout.stripe.test/cs_new_2',
      expires_at: 1893456000,
    });

    await expect(
      createCheckoutSessionAction(undefined, formDataFor({ businessId: 'biz_2', plan: 'basic', agreeToTerms: 'on' })),
    ).rejects.toThrow('REDIRECT');

    expect(mockCustomersCreate).not.toHaveBeenCalled();
    const [createArgs] = mockCheckoutSessionsCreate.mock.calls[0];
    expect(createArgs.customer).toBe('cus_existing');
  });
});

describe('createBillingPortalSessionAction', () => {
  it('redirects to the Portal session URL resolved from CustomerBillingProfile, not from any client input', async () => {
    mockRequireBusinessOwnership.mockResolvedValueOnce({ businessId: 'biz_1' });
    mockGetCustomerBillingProfile.mockResolvedValueOnce({ userId: 'user_1', stripeCustomerId: 'cus_1' });
    mockPortalSessionsCreate.mockResolvedValueOnce({ url: 'https://billing.stripe.test/portal_2' });

    await expect(createBillingPortalSessionAction('biz_1')).rejects.toThrow('REDIRECT:https://billing.stripe.test/portal_2');

    expect(mockPortalSessionsCreate).toHaveBeenCalledWith({
      customer: 'cus_1',
      return_url: 'https://app.example.test/account/claim-status',
    });
  });

  it('redirects back to plan selection when the customer has never subscribed', async () => {
    mockRequireBusinessOwnership.mockResolvedValueOnce({ businessId: 'biz_1' });
    mockGetCustomerBillingProfile.mockResolvedValueOnce(null);

    await expect(createBillingPortalSessionAction('biz_1')).rejects.toThrow('REDIRECT:/account/claim-status');
    expect(mockPortalSessionsCreate).not.toHaveBeenCalled();
  });
});
