/**
 * Unit tests for the SES event webhook Route Handler (Marketing stage).
 * Mirrors the existing Lob webhook test's structure. Signature
 * verification itself is mocked here (covered separately by
 * `lib/ses/__tests__/verify-sns-signature.test.ts`) so these tests focus
 * on the route's own dedup/rollup/suppression logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const {
  mockVerifySnsMessageSignature,
  mockPutMarketingSesEventIfNotExists,
  mockGetMarketingMessageBySesMessageId,
  mockApplyMarketingMessageSesRollup,
  mockPutMarketingSuppressionIfNotExists,
  mockTransitionOutreachToTerminal,
} = vi.hoisted(() => ({
  mockVerifySnsMessageSignature: vi.fn(),
  mockPutMarketingSesEventIfNotExists: vi.fn(),
  mockGetMarketingMessageBySesMessageId: vi.fn(),
  mockApplyMarketingMessageSesRollup: vi.fn(),
  mockPutMarketingSuppressionIfNotExists: vi.fn(),
  mockTransitionOutreachToTerminal: vi.fn(),
}));

vi.mock('@/lib/ses/verify-sns-signature', () => ({ verifySnsMessageSignature: mockVerifySnsMessageSignature }));
vi.mock('@/lib/db/marketing-ses-events', () => ({ putMarketingSesEventIfNotExists: mockPutMarketingSesEventIfNotExists }));
vi.mock('@/lib/db/marketing-messages', () => ({
  getMarketingMessageBySesMessageId: mockGetMarketingMessageBySesMessageId,
  applyMarketingMessageSesRollup: mockApplyMarketingMessageSesRollup,
}));
vi.mock('@/lib/db/marketing-suppressions', () => ({ putMarketingSuppressionIfNotExists: mockPutMarketingSuppressionIfNotExists }));
vi.mock('@/lib/db/marketing-outreach', () => ({ transitionOutreachToTerminal: mockTransitionOutreachToTerminal }));

import { POST } from '@/app/api/webhooks/ses/route';

const MESSAGE = { businessId: 'biz_1', marketingCampaignId: 'mktgcampaign_postcard_followup', sortKey: 'mktgcampaign_postcard_followup#1' };

function makeNotification(sesEvent: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
  return new Request('https://example.test/api/webhooks/ses', {
    method: 'POST',
    body: JSON.stringify({
      Type: 'Notification',
      MessageId: 'sns-msg-1',
      TopicArn: 'arn:aws:sns:us-east-1:123:webpresa-dev-ses-events',
      Message: JSON.stringify(sesEvent),
      Timestamp: '2026-08-21T00:00:00.000Z',
      SignatureVersion: '1',
      Signature: 'sig',
      SigningCertURL: 'https://sns.us-east-1.amazonaws.com/cert.pem',
      ...overrides,
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifySnsMessageSignature.mockResolvedValue(true);
  mockPutMarketingSesEventIfNotExists.mockResolvedValue(true);
  mockGetMarketingMessageBySesMessageId.mockResolvedValue(MESSAGE);
});

describe('POST /api/webhooks/ses — signature verification', () => {
  it('rejects an invalid signature with 400', async () => {
    mockVerifySnsMessageSignature.mockResolvedValue(false);
    const response = await POST(makeNotification({ eventType: 'Delivery', mail: { messageId: 'ses-1' } }));
    expect(response.status).toBe(400);
    expect(mockPutMarketingSesEventIfNotExists).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON with 400', async () => {
    const response = await POST(new Request('https://example.test/api/webhooks/ses', { method: 'POST', body: 'not json' }));
    expect(response.status).toBe(400);
  });
});

describe('POST /api/webhooks/ses — subscription confirmation', () => {
  it('auto-confirms by fetching SubscribeURL', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchSpy);

    const response = await POST(
      new Request('https://example.test/api/webhooks/ses', {
        method: 'POST',
        body: JSON.stringify({
          Type: 'SubscriptionConfirmation',
          MessageId: 'sns-msg-0',
          TopicArn: 'arn:aws:sns:us-east-1:123:webpresa-dev-ses-events',
          Message: 'You have chosen to subscribe...',
          SubscribeURL: 'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription',
          Timestamp: '2026-08-21T00:00:00.000Z',
          SignatureVersion: '1',
          Signature: 'sig',
          SigningCertURL: 'https://sns.us-east-1.amazonaws.com/cert.pem',
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith('https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription');
    vi.unstubAllGlobals();
  });
});

describe('POST /api/webhooks/ses — dedup', () => {
  it('does not re-apply a rollup on a duplicate SNS delivery (dedup no-op)', async () => {
    mockPutMarketingSesEventIfNotExists.mockResolvedValue(false);
    const response = await POST(makeNotification({ eventType: 'Delivery', mail: { messageId: 'ses-1' } }));
    expect(response.status).toBe(200);
    expect(mockGetMarketingMessageBySesMessageId).not.toHaveBeenCalled();
    expect(mockApplyMarketingMessageSesRollup).not.toHaveBeenCalled();
  });

  it('acknowledges (200) an event for a message it has no record of', async () => {
    mockGetMarketingMessageBySesMessageId.mockResolvedValue(null);
    const response = await POST(makeNotification({ eventType: 'Delivery', mail: { messageId: 'ses-unknown' } }));
    expect(response.status).toBe(200);
    expect(mockApplyMarketingMessageSesRollup).not.toHaveBeenCalled();
  });
});

describe('POST /api/webhooks/ses — event handling', () => {
  it('Delivery updates the message rollup, no suppression', async () => {
    const response = await POST(makeNotification({ eventType: 'Delivery', mail: { messageId: 'ses-1' } }));
    expect(response.status).toBe(200);
    expect(mockApplyMarketingMessageSesRollup).toHaveBeenCalledWith(MESSAGE.businessId, MESSAGE.sortKey, expect.objectContaining({ sesEventStatus: 'delivered' }));
    expect(mockPutMarketingSuppressionIfNotExists).not.toHaveBeenCalled();
    expect(mockTransitionOutreachToTerminal).not.toHaveBeenCalled();
  });

  it('a hard (Permanent) Bounce suppresses the recipient and ends the outreach', async () => {
    const response = await POST(
      makeNotification({
        eventType: 'Bounce',
        mail: { messageId: 'ses-1' },
        bounce: { bounceType: 'Permanent', bouncedRecipients: [{ emailAddress: 'Owner@Example.com' }] },
      }),
    );
    expect(response.status).toBe(200);
    expect(mockPutMarketingSuppressionIfNotExists).toHaveBeenCalledWith(expect.objectContaining({ emailNormalized: 'owner@example.com', reason: 'hard_bounce' }));
    expect(mockTransitionOutreachToTerminal).toHaveBeenCalledWith(expect.objectContaining({ status: 'suppressed', suppressionReason: 'hard_bounce' }));
  });

  it('a soft (Transient) Bounce records the event but does not suppress', async () => {
    const response = await POST(
      makeNotification({ eventType: 'Bounce', mail: { messageId: 'ses-1' }, bounce: { bounceType: 'Transient' } }),
    );
    expect(response.status).toBe(200);
    expect(mockPutMarketingSuppressionIfNotExists).not.toHaveBeenCalled();
    expect(mockTransitionOutreachToTerminal).not.toHaveBeenCalled();
  });

  it('Complaint suppresses the recipient and ends the outreach', async () => {
    const response = await POST(
      makeNotification({ eventType: 'Complaint', mail: { messageId: 'ses-1' }, complaint: { complainedRecipients: [{ emailAddress: 'owner@example.com' }] } }),
    );
    expect(response.status).toBe(200);
    expect(mockPutMarketingSuppressionIfNotExists).toHaveBeenCalledWith(expect.objectContaining({ reason: 'complaint' }));
    expect(mockTransitionOutreachToTerminal).toHaveBeenCalledWith(expect.objectContaining({ suppressionReason: 'complaint' }));
  });

  it('Reject is recorded but does not suppress', async () => {
    const response = await POST(makeNotification({ eventType: 'Reject', mail: { messageId: 'ses-1' } }));
    expect(response.status).toBe(200);
    expect(mockPutMarketingSuppressionIfNotExists).not.toHaveBeenCalled();
  });
});

describe('POST /api/webhooks/ses — internal errors', () => {
  it('returns 500 when a DB write throws (so SNS retries)', async () => {
    mockPutMarketingSesEventIfNotExists.mockRejectedValue(new Error('DynamoDB unavailable'));
    const response = await POST(makeNotification({ eventType: 'Delivery', mail: { messageId: 'ses-1' } }));
    expect(response.status).toBe(500);
  });
});
