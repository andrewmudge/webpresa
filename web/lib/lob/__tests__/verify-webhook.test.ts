import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'node:crypto';

vi.mock('server-only', () => ({}));

import { verifyLobWebhookSignature, LOB_SIGNATURE_HEADER, LOB_SIGNATURE_TIMESTAMP_HEADER } from '../verify-webhook';

const WEBHOOK_SECRET = 'test-webhook-secret';
const RAW_BODY = '{"id":"evt_1","event_type":{"id":"postcard.mailed"}}';

function sign(timestamp: string, rawBody: string, secret = WEBHOOK_SECRET): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

describe('verifyLobWebhookSignature', () => {
  it('accepts a validly-signed, fresh request', () => {
    const now = Date.now();
    const timestamp = String(Math.floor(now / 1000));
    const signature = sign(timestamp, RAW_BODY);

    expect(
      verifyLobWebhookSignature({ rawBody: RAW_BODY, signatureHeader: signature, timestampHeader: timestamp, webhookSecret: WEBHOOK_SECRET, now }),
    ).toBe(true);
  });

  it('exports the exact header names Lob documents', () => {
    expect(LOB_SIGNATURE_HEADER).toBe('lob-signature');
    expect(LOB_SIGNATURE_TIMESTAMP_HEADER).toBe('lob-signature-timestamp');
  });

  it('rejects a missing signature header', () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    expect(verifyLobWebhookSignature({ rawBody: RAW_BODY, signatureHeader: null, timestampHeader: timestamp, webhookSecret: WEBHOOK_SECRET })).toBe(
      false,
    );
  });

  it('rejects a missing timestamp header', () => {
    expect(
      verifyLobWebhookSignature({ rawBody: RAW_BODY, signatureHeader: 'abc', timestampHeader: null, webhookSecret: WEBHOOK_SECRET }),
    ).toBe(false);
  });

  it('rejects a non-numeric timestamp header', () => {
    const signature = sign('not-a-number', RAW_BODY);
    expect(
      verifyLobWebhookSignature({
        rawBody: RAW_BODY,
        signatureHeader: signature,
        timestampHeader: 'not-a-number',
        webhookSecret: WEBHOOK_SECRET,
      }),
    ).toBe(false);
  });

  it('rejects a signature computed with the wrong secret', () => {
    const now = Date.now();
    const timestamp = String(Math.floor(now / 1000));
    const signature = sign(timestamp, RAW_BODY, 'a-completely-different-secret');

    expect(
      verifyLobWebhookSignature({ rawBody: RAW_BODY, signatureHeader: signature, timestampHeader: timestamp, webhookSecret: WEBHOOK_SECRET, now }),
    ).toBe(false);
  });

  it('rejects a signature computed over a different body (tampered payload)', () => {
    const now = Date.now();
    const timestamp = String(Math.floor(now / 1000));
    const signature = sign(timestamp, '{"id":"evt_tampered"}');

    expect(
      verifyLobWebhookSignature({ rawBody: RAW_BODY, signatureHeader: signature, timestampHeader: timestamp, webhookSecret: WEBHOOK_SECRET, now }),
    ).toBe(false);
  });

  it('rejects a timestamp outside the 5-minute replay tolerance', () => {
    const now = Date.now();
    const staleTimestamp = String(Math.floor((now - 6 * 60 * 1000) / 1000));
    const signature = sign(staleTimestamp, RAW_BODY);

    expect(
      verifyLobWebhookSignature({
        rawBody: RAW_BODY,
        signatureHeader: signature,
        timestampHeader: staleTimestamp,
        webhookSecret: WEBHOOK_SECRET,
        now,
      }),
    ).toBe(false);
  });

  it('accepts a timestamp just inside the 5-minute replay tolerance', () => {
    const now = Date.now();
    const timestamp = String(Math.floor((now - 4 * 60 * 1000) / 1000));
    const signature = sign(timestamp, RAW_BODY);

    expect(
      verifyLobWebhookSignature({ rawBody: RAW_BODY, signatureHeader: signature, timestampHeader: timestamp, webhookSecret: WEBHOOK_SECRET, now }),
    ).toBe(true);
  });
});
