/**
 * Unit tests for the Stripe webhook Route Handler (Stage 18). All Stripe SDK
 * and DynamoDB interactions are mocked — no real network calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const {
  mockConstructEvent,
  mockSubscriptionsRetrieve,
  mockGetBusinessById,
  mockGetBusinessByStripeSubscriptionId,
  mockUpdateBusiness,
  mockPutStripeWebhookFailure,
} = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockSubscriptionsRetrieve: vi.fn(),
  mockGetBusinessById: vi.fn(),
  mockGetBusinessByStripeSubscriptionId: vi.fn(),
  mockUpdateBusiness: vi.fn(),
  mockPutStripeWebhookFailure: vi.fn(),
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripeClient: vi.fn(async () => ({
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
  })),
}));

vi.mock('@/lib/secrets', () => ({
  getStripeSecret: vi.fn(async () => ({ secretKey: 'sk_test_x', webhookSecret: 'whsec_test_x' })),
}));

vi.mock('@/lib/db/businesses', () => ({
  getBusinessById: mockGetBusinessById,
  getBusinessByStripeSubscriptionId: mockGetBusinessByStripeSubscriptionId,
  updateBusiness: mockUpdateBusiness,
}));

vi.mock('@/lib/db/stripe-webhook-failures', () => ({
  putStripeWebhookFailure: mockPutStripeWebhookFailure,
}));

import { POST } from '@/app/api/webhooks/stripe/route';

function makeRequest(): Request {
  return new Request('https://example.test/api/webhooks/stripe', {
    method: 'POST',
    body: '{}',
    headers: { 'stripe-signature': 'sig_test' },
  });
}

beforeEach(() => {
  mockConstructEvent.mockReset();
  mockSubscriptionsRetrieve.mockReset();
  mockGetBusinessById.mockReset();
  mockGetBusinessByStripeSubscriptionId.mockReset();
  mockUpdateBusiness.mockReset();
  mockPutStripeWebhookFailure.mockReset();
  mockPutStripeWebhookFailure.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.STRIPE_PRICE_ID_BASIC_ANNUAL;
});

describe('POST /api/webhooks/stripe', () => {
  it('rejects an invalid signature with 400 before any processing', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(mockGetBusinessById).not.toHaveBeenCalled();
  });

  it('records a StripeWebhookFailure diagnostic on an invalid signature (Stage 24)', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });

    await POST(makeRequest());

    expect(mockPutStripeWebhookFailure).toHaveBeenCalledTimes(1);
    const failure = mockPutStripeWebhookFailure.mock.calls[0][0];
    expect(failure.errorCategory).toBe('invalid_signature');
    expect(failure.errorMessage).toBe('bad signature');
  });

  it('never fails the response even if writing the StripeWebhookFailure diagnostic itself throws', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });
    mockPutStripeWebhookFailure.mockRejectedValueOnce(new Error('dynamodb down'));

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
  });

  it('acknowledges (200) and ignores an unlisted event type', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'customer.created',
      created: 1700000000,
      data: { object: {} },
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(mockGetBusinessById).not.toHaveBeenCalled();
  });

  it('ignores an event tagged with a non-website-subscription billingPurpose — the future domain-billing boundary', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_2',
      type: 'customer.subscription.updated',
      created: 1700000000,
      data: { object: { id: 'sub_1', metadata: { businessId: 'biz_1', billingPurpose: 'domain_purchase' } } },
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(mockGetBusinessById).not.toHaveBeenCalled();
  });

  it('acknowledges (200), never 500s, when the business cannot be resolved at all', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_3',
      type: 'customer.subscription.updated',
      created: 1700000000,
      data: { object: { id: 'sub_1', metadata: {} } },
    });
    mockGetBusinessByStripeSubscriptionId.mockResolvedValueOnce(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
  });

  it('acknowledges (200) when metadata resolves a businessId that no longer exists', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_3b',
      type: 'customer.subscription.updated',
      created: 1700000000,
      data: { object: { id: 'sub_1', metadata: { businessId: 'biz_missing' } } },
    });
    mockGetBusinessById.mockResolvedValueOnce(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
  });

  it('processes a valid subscription.updated event end-to-end — re-fetches current state and writes the snapshot', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_4',
      type: 'customer.subscription.updated',
      created: 1700000000,
      data: { object: { id: 'sub_1', metadata: { businessId: 'biz_1', billingPurpose: 'website_subscription' } } },
    });
    mockGetBusinessById.mockResolvedValueOnce({ businessId: 'biz_1' });
    mockSubscriptionsRetrieve.mockResolvedValueOnce({
      id: 'sub_1',
      status: 'active',
      cancel_at_period_end: false,
      items: { data: [{ price: { id: 'price_x' }, current_period_end: 1893456000 }] },
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith('sub_1');
    expect(mockUpdateBusiness).toHaveBeenCalledWith(
      'biz_1',
      expect.objectContaining({
        subscriptionStatus: 'active',
        status: 'customer',
        stripeSubscriptionId: 'sub_1',
        cancelAtPeriodEnd: false,
        lastStripeEventId: 'evt_4',
      }),
    );
  });

  it('resolves plan and billingInterval from the subscription price ID and writes both to the business', async () => {
    process.env.STRIPE_PRICE_ID_BASIC_ANNUAL = 'price_basic_annual_test';

    mockConstructEvent.mockReturnValue({
      id: 'evt_4b',
      type: 'customer.subscription.updated',
      created: 1700000000,
      data: { object: { id: 'sub_1', metadata: { businessId: 'biz_1', billingPurpose: 'website_subscription' } } },
    });
    mockGetBusinessById.mockResolvedValueOnce({ businessId: 'biz_1' });
    mockSubscriptionsRetrieve.mockResolvedValueOnce({
      id: 'sub_1',
      status: 'active',
      cancel_at_period_end: false,
      items: { data: [{ price: { id: 'price_basic_annual_test' }, current_period_end: 1893456000 }] },
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(mockUpdateBusiness).toHaveBeenCalledWith(
      'biz_1',
      expect.objectContaining({ plan: 'basic', billingInterval: 'annual' }),
    );
  });

  it('resolves the business via the stripe-subscription-id-index GSI when metadata carries no businessId', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_5',
      type: 'invoice.payment_failed',
      created: 1700000000,
      data: {
        object: {
          parent: { subscription_details: { subscription: 'sub_2', metadata: {} } },
        },
      },
    });
    mockGetBusinessByStripeSubscriptionId.mockResolvedValueOnce({ businessId: 'biz_2' });
    mockGetBusinessById.mockResolvedValueOnce({ businessId: 'biz_2' });
    mockSubscriptionsRetrieve.mockResolvedValueOnce({
      id: 'sub_2',
      status: 'past_due',
      cancel_at_period_end: false,
      items: { data: [{ price: { id: 'price_x' }, current_period_end: 1893456000 }] },
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(mockGetBusinessByStripeSubscriptionId).toHaveBeenCalledWith('sub_2');
    expect(mockUpdateBusiness).toHaveBeenCalledWith('biz_2', expect.objectContaining({ subscriptionStatus: 'past_due' }));
    // past_due must never move a business to cancelled — it stays whatever it already was.
    const payload = mockUpdateBusiness.mock.calls.find(([id]) => id === 'biz_2')?.[1];
    expect(payload).not.toHaveProperty('status');
  });

  it('maps a canceled subscription to status: cancelled', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_cancel',
      type: 'customer.subscription.deleted',
      created: 1700000000,
      data: { object: { id: 'sub_1', metadata: { businessId: 'biz_1', billingPurpose: 'website_subscription' } } },
    });
    mockGetBusinessById.mockResolvedValueOnce({ businessId: 'biz_1' });
    mockSubscriptionsRetrieve.mockResolvedValueOnce({
      id: 'sub_1',
      status: 'canceled',
      cancel_at_period_end: false,
      items: { data: [{ price: { id: 'price_x' }, current_period_end: 1893456000 }] },
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(mockUpdateBusiness).toHaveBeenCalledWith(
      'biz_1',
      expect.objectContaining({ subscriptionStatus: 'canceled', status: 'cancelled' }),
    );
  });

  it('returns 500 on an unexpected internal failure so Stripe retries — never a silent drop', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_6',
      type: 'customer.subscription.updated',
      created: 1700000000,
      data: { object: { id: 'sub_1', metadata: { businessId: 'biz_1' } } },
    });
    mockGetBusinessById.mockResolvedValueOnce({ businessId: 'biz_1' });
    mockSubscriptionsRetrieve.mockRejectedValueOnce(new Error('stripe api down'));

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
  });

  it('records a StripeWebhookFailure diagnostic on an internal processing error (Stage 24)', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_6b',
      type: 'customer.subscription.updated',
      created: 1700000000,
      data: { object: { id: 'sub_1', metadata: { businessId: 'biz_1' } } },
    });
    mockGetBusinessById.mockResolvedValueOnce({ businessId: 'biz_1' });
    mockSubscriptionsRetrieve.mockRejectedValueOnce(new Error('stripe api down'));

    await POST(makeRequest());

    expect(mockPutStripeWebhookFailure).toHaveBeenCalledTimes(1);
    const failure = mockPutStripeWebhookFailure.mock.calls[0][0];
    expect(failure).toMatchObject({
      errorCategory: 'processing_failed',
      errorMessage: 'stripe api down',
      eventId: 'evt_6b',
      eventType: 'customer.subscription.updated',
      businessId: 'biz_1',
    });
  });

  it('duplicate delivery of the same event is a harmless repeat write, not an error', async () => {
    const event = {
      id: 'evt_7',
      type: 'customer.subscription.updated',
      created: 1700000000,
      data: { object: { id: 'sub_1', metadata: { businessId: 'biz_1' } } },
    };
    mockConstructEvent.mockReturnValue(event);
    mockGetBusinessById.mockResolvedValue({ businessId: 'biz_1' });
    mockSubscriptionsRetrieve.mockResolvedValue({
      id: 'sub_1',
      status: 'active',
      cancel_at_period_end: false,
      items: { data: [{ price: { id: 'price_x' }, current_period_end: 1893456000 }] },
    });

    const first = await POST(makeRequest());
    const second = await POST(makeRequest());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(mockUpdateBusiness).toHaveBeenCalledTimes(2);
  });
});
