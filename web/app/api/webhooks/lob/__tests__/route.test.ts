/**
 * Unit tests for the Lob webhook Route Handler (Stage 22 Phase 5). All
 * secrets/DB interactions are mocked; signature verification runs for
 * real (it's pure, no external calls) so these tests also exercise the
 * actual HMAC check end to end.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';

vi.mock('server-only', () => ({}));

const {
  mockGetLobSecret,
  mockGetPostcardByProviderPostcardId,
  mockApplyPostcardWebhookRollup,
  mockPutPostcardWebhookEvent,
  mockStartMarketingOutreach,
} = vi.hoisted(() => ({
  mockGetLobSecret: vi.fn(),
  mockGetPostcardByProviderPostcardId: vi.fn(),
  mockApplyPostcardWebhookRollup: vi.fn(),
  mockPutPostcardWebhookEvent: vi.fn(),
  mockStartMarketingOutreach: vi.fn(),
}));

vi.mock('@/lib/secrets', () => ({ getLobSecret: mockGetLobSecret }));
vi.mock('@/lib/db/postcards', () => ({
  getPostcardByProviderPostcardId: mockGetPostcardByProviderPostcardId,
  applyPostcardWebhookRollup: mockApplyPostcardWebhookRollup,
}));
vi.mock('@/lib/db/postcard-webhook-events', () => ({ putPostcardWebhookEvent: mockPutPostcardWebhookEvent }));
vi.mock('@/lib/marketing/campaign-start', () => ({ startMarketingOutreach: mockStartMarketingOutreach }));

import { POST } from '@/app/api/webhooks/lob/route';

const WEBHOOK_SECRET = 'test-webhook-secret';
const POSTCARD_ID = 'postcard_1';
const PROVIDER_POSTCARD_ID = 'psc_abc123';

function sign(timestamp: string, rawBody: string, secret = WEBHOOK_SECRET): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

function makeRequest(bodyObj: unknown, { validSignature = true, secret = WEBHOOK_SECRET }: { validSignature?: boolean; secret?: string } = {}) {
  const rawBody = JSON.stringify(bodyObj);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = validSignature ? sign(timestamp, rawBody, secret) : 'not-a-real-signature';
  return new Request('https://example.test/api/webhooks/lob', {
    method: 'POST',
    body: rawBody,
    headers: { 'lob-signature': signature, 'lob-signature-timestamp': timestamp },
  });
}

function billedEventPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt_1',
    event_type: { id: 'postcard.billed', resource: 'postcards', object: 'event_type' },
    date_created: '2026-08-08T12:00:00.000Z',
    object: 'event',
    body: { id: PROVIDER_POSTCARD_ID },
    ...overrides,
  };
}

const BUSINESS_ID = 'biz_1';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetLobSecret.mockResolvedValue({ apiKey: 'test_x', webhookSecret: WEBHOOK_SECRET });
  mockGetPostcardByProviderPostcardId.mockResolvedValue({
    postcardId: POSTCARD_ID,
    businessId: BUSINESS_ID,
    providerPostcardId: PROVIDER_POSTCARD_ID,
    campaignRecipientId: 'recipient_1',
  });
  mockPutPostcardWebhookEvent.mockResolvedValue(true);
});

describe('POST /api/webhooks/lob — signature verification', () => {
  it('rejects an invalid signature with 400 before any DB lookup', async () => {
    const response = await POST(makeRequest(billedEventPayload(), { validSignature: false }));
    expect(response.status).toBe(400);
    expect(mockGetPostcardByProviderPostcardId).not.toHaveBeenCalled();
  });

  it('rejects with 400 when no webhookSecret is configured yet (fail closed)', async () => {
    mockGetLobSecret.mockResolvedValue({ apiKey: 'test_x', webhookSecret: '' });
    const response = await POST(makeRequest(billedEventPayload()));
    expect(response.status).toBe(400);
    expect(mockGetPostcardByProviderPostcardId).not.toHaveBeenCalled();
  });
});

describe('POST /api/webhooks/lob — unresolvable/unknown', () => {
  it('acknowledges (200) a payload missing the fields needed to resolve a postcard', async () => {
    const response = await POST(makeRequest({ id: 'evt_1', object: 'event' }));
    expect(response.status).toBe(200);
    expect(mockPutPostcardWebhookEvent).not.toHaveBeenCalled();
  });

  it('acknowledges (200) an event for a postcard we have no record of', async () => {
    mockGetPostcardByProviderPostcardId.mockResolvedValue(null);
    const response = await POST(makeRequest(billedEventPayload()));
    expect(response.status).toBe(200);
    expect(mockPutPostcardWebhookEvent).not.toHaveBeenCalled();
  });
});

describe('POST /api/webhooks/lob — happy path', () => {
  it('records durable history and applies the mapped rollup for a newly-recorded event', async () => {
    const response = await POST(makeRequest(billedEventPayload()));

    expect(response.status).toBe(200);
    expect(mockPutPostcardWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({ lobEventId: 'evt_1', postcardId: POSTCARD_ID, eventType: 'postcard.billed', mappedStatus: 'mailed' }),
    );
    expect(mockApplyPostcardWebhookRollup).toHaveBeenCalledWith(POSTCARD_ID, { status: 'mailed', mailedAt: '2026-08-08T12:00:00.000Z' });
  });

  it('does not re-apply the rollup on a duplicate delivery (dedup no-op)', async () => {
    mockPutPostcardWebhookEvent.mockResolvedValue(false);
    const response = await POST(makeRequest(billedEventPayload()));

    expect(response.status).toBe(200);
    expect(mockApplyPostcardWebhookRollup).not.toHaveBeenCalled();
  });

  it('records history but skips the rollup call for an in-flight tracking event with no mapped change', async () => {
    const response = await POST(makeRequest(billedEventPayload({ event_type: { id: 'postcard.in_transit' } })));

    expect(response.status).toBe(200);
    const recordedEvent = mockPutPostcardWebhookEvent.mock.calls[0][0];
    expect(recordedEvent.eventType).toBe('postcard.in_transit');
    expect(recordedEvent.mappedStatus).toBeUndefined();
    expect(mockApplyPostcardWebhookRollup).not.toHaveBeenCalled();
  });
});

describe('POST /api/webhooks/lob — Marketing stage: delivery triggers enrollment', () => {
  it('starts the marketing outreach campaign on a newly-recorded delivered event', async () => {
    const response = await POST(makeRequest(billedEventPayload({ event_type: { id: 'postcard.delivered' } })));

    expect(response.status).toBe(200);
    expect(mockStartMarketingOutreach).toHaveBeenCalledWith(BUSINESS_ID, {
      postcardId: POSTCARD_ID,
      campaignRecipientId: 'recipient_1',
      deliveredAt: '2026-08-08T12:00:00.000Z',
    });
  });

  it('does not start the campaign for a non-delivery event (e.g. billed/mailed)', async () => {
    const response = await POST(makeRequest(billedEventPayload()));
    expect(response.status).toBe(200);
    expect(mockStartMarketingOutreach).not.toHaveBeenCalled();
  });

  it('does not start the campaign a second time on a duplicate delivered webhook (dedup no-op)', async () => {
    mockPutPostcardWebhookEvent.mockResolvedValue(false);
    const response = await POST(makeRequest(billedEventPayload({ event_type: { id: 'postcard.delivered' } })));
    expect(response.status).toBe(200);
    expect(mockStartMarketingOutreach).not.toHaveBeenCalled();
  });
});

describe('POST /api/webhooks/lob — internal errors', () => {
  it('returns 500 when the DB write throws (so Lob retries)', async () => {
    mockPutPostcardWebhookEvent.mockRejectedValue(new Error('DynamoDB unavailable'));
    const response = await POST(makeRequest(billedEventPayload()));
    expect(response.status).toBe(500);
  });
});
