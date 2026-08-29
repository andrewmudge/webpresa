/**
 * Unit tests for the OpenSRS Storefront webhook Route Handler. All
 * secrets/DB/Vercel interactions are mocked; signature verification runs
 * for real (it's pure, no external calls) so these tests also exercise the
 * actual HMAC check end to end. Payload shape and signature format mirror a
 * real "Send Test" delivery confirmed in PTE (2026-08-29).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';

vi.mock('server-only', () => ({}));

const {
  mockGetOpenSrsStorefrontSecret,
  mockListDomainPurchaseIntentsByStorefrontUsername,
  mockPutDomainPurchaseIntent,
  mockGetBusinessById,
  mockGetDomainConnectionByNormalizedDomain,
  mockCreateDomainConnectionRecord,
  mockPutDomainConnection,
  mockAddProjectDomain,
} = vi.hoisted(() => ({
  mockGetOpenSrsStorefrontSecret: vi.fn(),
  mockListDomainPurchaseIntentsByStorefrontUsername: vi.fn(),
  mockPutDomainPurchaseIntent: vi.fn(),
  mockGetBusinessById: vi.fn(),
  mockGetDomainConnectionByNormalizedDomain: vi.fn(),
  mockCreateDomainConnectionRecord: vi.fn(),
  mockPutDomainConnection: vi.fn(),
  mockAddProjectDomain: vi.fn(),
}));

vi.mock('@/lib/secrets', () => ({ getOpenSrsStorefrontSecret: mockGetOpenSrsStorefrontSecret }));
vi.mock('@/lib/db/domain-purchase-intents', () => ({
  listDomainPurchaseIntentsByStorefrontUsername: mockListDomainPurchaseIntentsByStorefrontUsername,
  putDomainPurchaseIntent: mockPutDomainPurchaseIntent,
}));
vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById }));
vi.mock('@/lib/db/domain-connections', () => ({
  getDomainConnectionByNormalizedDomain: mockGetDomainConnectionByNormalizedDomain,
  createDomainConnectionRecord: mockCreateDomainConnectionRecord,
  putDomainConnection: mockPutDomainConnection,
}));
vi.mock('@/lib/vercel/domains', () => ({ addProjectDomain: mockAddProjectDomain }));

import { POST } from '@/app/api/webhooks/opensrs/route';

const WEBHOOK_KEY = 'test-webhook-key';
const INTENT_ID = 'dpi_1';
const BUSINESS_ID = 'biz_1';
const USER_ID = 'user-sub-1';
const USERNAME = 'wpabc123def456';
const EVENT_ID = 'a121ca61-7c83-4338-b600-4a4a839ce898';
const DOMAIN = 'coastalplumbing.com';

function sign(rawBody: string, secret = WEBHOOK_KEY): string {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}

function makeRequest(bodyObj: unknown, { validSignature = true, secret = WEBHOOK_KEY }: { validSignature?: boolean; secret?: string } = {}) {
  const rawBody = JSON.stringify(bodyObj);
  const signature = validSignature ? sign(rawBody, secret) : 'sha256=not-a-real-signature';
  return new Request('https://example.test/api/webhooks/opensrs', {
    method: 'POST',
    body: rawBody,
    headers: { 'x-signature': signature },
  });
}

/** Mirrors the real "Send Test" payload shape confirmed in PTE. */
function domainRegisteredPayload(overrides: Record<string, unknown> = {}) {
  return {
    event: 'Domain registration',
    event_id: EVENT_ID,
    username: USERNAME,
    changes_by: 'Customer',
    is_success: 'true',
    domain_name: DOMAIN,
    created_date: '2026-08-29T10:12:26.000Z',
    record_type: 'domain',
    data: {},
    ...overrides,
  };
}

const PENDING_INTENT = {
  intentId: INTENT_ID,
  businessId: BUSINESS_ID,
  userId: USER_ID,
  storefrontUsername: USERNAME,
  status: 'pending' as const,
  ttl: Math.floor(Date.now() / 1000) + 1000,
  createdAt: '2026-08-27T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOpenSrsStorefrontSecret.mockResolvedValue({ clientId: 'test_cid', apiKey: 'test_x', webhookKey: WEBHOOK_KEY });
  mockListDomainPurchaseIntentsByStorefrontUsername.mockResolvedValue([PENDING_INTENT]);
  mockGetBusinessById.mockResolvedValue({ businessId: BUSINESS_ID, ownerUserId: USER_ID, slug: 'coastal-plumbing' });
  mockGetDomainConnectionByNormalizedDomain.mockResolvedValue(null);
  mockCreateDomainConnectionRecord.mockResolvedValue(true);
  mockAddProjectDomain.mockResolvedValue({ vercelProjectDomainId: DOMAIN, verified: true, verificationRecords: [] });
  mockPutDomainConnection.mockResolvedValue(undefined);
  mockPutDomainPurchaseIntent.mockResolvedValue(undefined);
});

describe('POST /api/webhooks/opensrs — signature verification', () => {
  it('rejects an invalid signature with 400 before any DB lookup', async () => {
    const response = await POST(makeRequest(domainRegisteredPayload(), { validSignature: false }));
    expect(response.status).toBe(400);
    expect(mockListDomainPurchaseIntentsByStorefrontUsername).not.toHaveBeenCalled();
  });

  it('rejects a signature missing the sha256= prefix', async () => {
    const rawBody = JSON.stringify(domainRegisteredPayload());
    const request = new Request('https://example.test/api/webhooks/opensrs', {
      method: 'POST',
      body: rawBody,
      headers: { 'x-signature': createHmac('sha256', WEBHOOK_KEY).update(rawBody).digest('hex') }, // no prefix
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

describe('POST /api/webhooks/opensrs — unresolvable/unknown', () => {
  it('acknowledges (200) a non-registration Domain Events event (e.g. a DNS change) without processing', async () => {
    const response = await POST(makeRequest(domainRegisteredPayload({ event: 'Add DNS record' })));
    expect(response.status).toBe(200);
    expect(mockListDomainPurchaseIntentsByStorefrontUsername).not.toHaveBeenCalled();
  });

  it('acknowledges (200) an unsuccessful event', async () => {
    const response = await POST(makeRequest(domainRegisteredPayload({ is_success: 'false' })));
    expect(response.status).toBe(200);
    expect(mockListDomainPurchaseIntentsByStorefrontUsername).not.toHaveBeenCalled();
  });

  it('acknowledges (200) a payload missing fields needed to resolve an intent', async () => {
    const response = await POST(makeRequest({ event: 'Domain registration', record_type: 'domain', is_success: 'true' }));
    expect(response.status).toBe(200);
    expect(mockListDomainPurchaseIntentsByStorefrontUsername).not.toHaveBeenCalled();
  });

  it('acknowledges (200) an event referencing a username with no pending intent (expired/unknown)', async () => {
    mockListDomainPurchaseIntentsByStorefrontUsername.mockResolvedValue([]);
    const response = await POST(makeRequest(domainRegisteredPayload()));
    expect(response.status).toBe(200);
    expect(mockGetBusinessById).not.toHaveBeenCalled();
  });

  it('acknowledges (200) without connecting the domain when the intent no longer matches the business owner', async () => {
    mockGetBusinessById.mockResolvedValue({ businessId: BUSINESS_ID, ownerUserId: 'someone-else', slug: 'coastal-plumbing' });
    const response = await POST(makeRequest(domainRegisteredPayload()));
    expect(response.status).toBe(200);
    expect(mockAddProjectDomain).not.toHaveBeenCalled();
  });

  it('acknowledges (200) and never overwrites a domain already tracked under a different event', async () => {
    mockGetDomainConnectionByNormalizedDomain.mockResolvedValue({
      normalizedDomain: DOMAIN,
      businessId: BUSINESS_ID,
      registration: { orderId: 'some_other_event_id', purchasedAt: '2026-08-01T00:00:00.000Z' },
    });
    const response = await POST(makeRequest(domainRegisteredPayload()));
    expect(response.status).toBe(200);
    expect(mockAddProjectDomain).not.toHaveBeenCalled();
    expect(mockPutDomainConnection).not.toHaveBeenCalled();
  });
});

describe('POST /api/webhooks/opensrs — happy path', () => {
  it('reserves the domain, attaches it in Vercel, and marks the connection connected', async () => {
    const response = await POST(makeRequest(domainRegisteredPayload()));

    expect(response.status).toBe(200);
    expect(mockCreateDomainConnectionRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        normalizedDomain: DOMAIN,
        businessId: BUSINESS_ID,
        ownerUserId: USER_ID,
        source: 'webpresa_registered',
        registrarProvider: 'opensrs',
        registration: expect.objectContaining({ orderId: EVENT_ID }),
      }),
    );
    expect(mockAddProjectDomain).toHaveBeenCalledWith(DOMAIN, expect.any(Object));
    expect(mockPutDomainConnection).toHaveBeenCalledWith(expect.objectContaining({ status: 'connected' }));
    expect(mockPutDomainPurchaseIntent).toHaveBeenCalledWith(expect.objectContaining({ status: 'fulfilled', domain: DOMAIN }));
  });

  it('picks the pending intent when multiple exist for the same username', async () => {
    mockListDomainPurchaseIntentsByStorefrontUsername.mockResolvedValue([
      { ...PENDING_INTENT, intentId: 'dpi_old', status: 'fulfilled' as const, businessId: 'biz_wrong' },
      PENDING_INTENT,
    ]);
    const response = await POST(makeRequest(domainRegisteredPayload()));
    expect(response.status).toBe(200);
    expect(mockGetBusinessById).toHaveBeenCalledWith(BUSINESS_ID);
  });

  it('is idempotent on a duplicate delivery for an already-connected domain (no second Vercel call)', async () => {
    mockGetDomainConnectionByNormalizedDomain.mockResolvedValue({
      normalizedDomain: DOMAIN,
      businessId: BUSINESS_ID,
      status: 'active',
      registration: { orderId: EVENT_ID, purchasedAt: '2026-08-01T00:00:00.000Z' },
    });
    const response = await POST(makeRequest(domainRegisteredPayload()));

    expect(response.status).toBe(200);
    expect(mockAddProjectDomain).not.toHaveBeenCalled();
    expect(mockCreateDomainConnectionRecord).not.toHaveBeenCalled();
  });

  it('retries the Vercel attach on redelivery after a previously failed attempt', async () => {
    mockGetDomainConnectionByNormalizedDomain.mockResolvedValue({
      normalizedDomain: DOMAIN,
      businessId: BUSINESS_ID,
      status: 'failed',
      registration: { orderId: EVENT_ID, purchasedAt: '2026-08-01T00:00:00.000Z' },
    });
    const response = await POST(makeRequest(domainRegisteredPayload()));

    expect(response.status).toBe(200);
    expect(mockAddProjectDomain).toHaveBeenCalled();
    expect(mockPutDomainConnection).toHaveBeenCalledWith(expect.objectContaining({ status: 'connected' }));
  });
});

describe('POST /api/webhooks/opensrs — internal errors', () => {
  it('returns 500 and records a failed status when the Vercel attach throws (so redelivery can retry)', async () => {
    mockAddProjectDomain.mockRejectedValue(new Error('Vercel unavailable'));
    const response = await POST(makeRequest(domainRegisteredPayload()));

    expect(response.status).toBe(500);
    expect(mockPutDomainConnection).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });
});
