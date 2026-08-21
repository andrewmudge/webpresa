/**
 * Unit tests for SNS message signature verification — runs the real
 * signing algorithm against a locally-generated keypair (no mocked
 * crypto), matching this repo's own stated philosophy for the Lob webhook
 * signature tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateKeyPairSync, createSign } from 'crypto';

vi.mock('server-only', () => ({}));

import { verifySnsMessageSignature, type SnsMessageEnvelope } from '../verify-sns-signature';

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

function sign(stringToSign: string, algorithm: 'sha1' | 'sha256' = 'sha1'): string {
  const signer = createSign(algorithm);
  signer.update(stringToSign, 'utf8');
  signer.end();
  return signer.sign(privateKey, 'base64');
}

function stringToSignFor(fields: string[], envelope: Record<string, string | undefined>): string {
  let result = '';
  for (const field of fields) {
    const value = envelope[field];
    if (value === undefined) continue;
    result += `${field}\n${value}\n`;
  }
  return result;
}

const CERT_URL = 'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-abc123.pem';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, text: async () => publicKey }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('verifySnsMessageSignature — Notification', () => {
  const NOTIFICATION_FIELDS = ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type'];

  function buildEnvelope(overrides: Partial<SnsMessageEnvelope> = {}): SnsMessageEnvelope {
    const base = {
      Type: 'Notification',
      MessageId: 'msg-1',
      TopicArn: 'arn:aws:sns:us-east-1:123456789012:webpresa-dev-ses-events',
      Message: '{"eventType":"Delivery","mail":{"messageId":"ses-1"}}',
      Timestamp: '2026-08-21T00:00:00.000Z',
      SignatureVersion: '1',
      SigningCertURL: CERT_URL,
      ...overrides,
    };
    const stringToSign = stringToSignFor(NOTIFICATION_FIELDS, base as unknown as Record<string, string>);
    return { ...base, Signature: sign(stringToSign) } as SnsMessageEnvelope;
  }

  it('verifies a validly signed message', async () => {
    expect(await verifySnsMessageSignature(buildEnvelope())).toBe(true);
  });

  it('rejects a message whose body was tampered with after signing', async () => {
    const envelope = buildEnvelope();
    envelope.Message = '{"eventType":"Bounce"}'; // mutated post-sign
    expect(await verifySnsMessageSignature(envelope)).toBe(false);
  });

  it('rejects a signature produced by a different key', async () => {
    const { privateKey: otherKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const envelope = buildEnvelope();
    const signer = createSign('sha1');
    signer.update(stringToSignFor(NOTIFICATION_FIELDS, envelope as unknown as Record<string, string>), 'utf8');
    signer.end();
    envelope.Signature = signer.sign(otherKey, 'base64');
    expect(await verifySnsMessageSignature(envelope)).toBe(false);
  });

  it('verifies with SHA-256 when SignatureVersion is "2"', async () => {
    const base = {
      Type: 'Notification',
      MessageId: 'msg-2',
      TopicArn: 'arn:aws:sns:us-east-1:123456789012:webpresa-dev-ses-events',
      Message: '{}',
      Timestamp: '2026-08-21T00:00:00.000Z',
      SignatureVersion: '2',
      SigningCertURL: CERT_URL,
    };
    const stringToSign = stringToSignFor(NOTIFICATION_FIELDS, base as unknown as Record<string, string>);
    const envelope = { ...base, Signature: sign(stringToSign, 'sha256') } as SnsMessageEnvelope;
    expect(await verifySnsMessageSignature(envelope)).toBe(true);
  });

  it('rejects a SigningCertURL not hosted on an AWS SNS domain — the SSRF/spoofing guard — without ever fetching it', async () => {
    const envelope = buildEnvelope({ SigningCertURL: 'https://evil.example.com/cert.pem' });
    expect(await verifySnsMessageSignature(envelope)).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a non-https SigningCertURL', async () => {
    const envelope = buildEnvelope({ SigningCertURL: 'http://sns.us-east-1.amazonaws.com/cert.pem' });
    expect(await verifySnsMessageSignature(envelope)).toBe(false);
  });

  it('rejects a malformed SigningCertURL rather than throwing', async () => {
    const envelope = buildEnvelope({ SigningCertURL: 'not-a-url' });
    expect(await verifySnsMessageSignature(envelope)).toBe(false);
  });
});

describe('verifySnsMessageSignature — SubscriptionConfirmation', () => {
  it('verifies using the (Un)SubscriptionConfirmation field order, distinct from Notification', async () => {
    const fields = ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'];
    const base = {
      Type: 'SubscriptionConfirmation',
      MessageId: 'msg-3',
      TopicArn: 'arn:aws:sns:us-east-1:123456789012:webpresa-dev-ses-events',
      Token: 'token-abc',
      Message: 'You have chosen to subscribe to the topic...',
      SubscribeURL: 'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription&Token=token-abc',
      Timestamp: '2026-08-21T00:00:00.000Z',
      SignatureVersion: '1',
      SigningCertURL: CERT_URL,
    };
    const stringToSign = stringToSignFor(fields, base as unknown as Record<string, string>);
    const envelope = { ...base, Signature: sign(stringToSign) } as SnsMessageEnvelope;
    expect(await verifySnsMessageSignature(envelope)).toBe(true);
  });
});
