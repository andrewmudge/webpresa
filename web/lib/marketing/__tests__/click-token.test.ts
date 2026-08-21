/**
 * Unit tests for the self-contained encrypted click-tracking token — the
 * JWE round-trip runs for real (no crypto mocking), so these also exercise
 * the actual encryption/decryption behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockGetMarketingClickTokenSecret = vi.hoisted(() => vi.fn());
vi.mock('@/lib/secrets', () => ({ getMarketingClickTokenSecret: mockGetMarketingClickTokenSecret }));

import { createClickToken, decodeClickToken } from '../click-token';

const PAYLOAD = {
  messageId: 'mktgmsg_1',
  businessId: 'biz_12345',
  marketingCampaignId: 'mktgcampaign_postcard_followup',
  emailSequence: 1 as const,
  linkLabel: 'preview',
  destinationUrl: 'https://webpresa.com/b/some-plumber',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetMarketingClickTokenSecret.mockResolvedValue({ encryptionKey: 'a-real-secret-value-for-testing' });
});

describe('createClickToken / decodeClickToken', () => {
  it('round-trips the exact payload', async () => {
    const token = await createClickToken(PAYLOAD);
    const decoded = await decodeClickToken(token);
    expect(decoded).toEqual(PAYLOAD);
  });

  it('never exposes the plaintext businessId in the encoded token string', async () => {
    const token = await createClickToken(PAYLOAD);
    expect(token).not.toContain(PAYLOAD.businessId);
    expect(token).not.toContain(PAYLOAD.destinationUrl);
  });

  it('rejects a tampered token', async () => {
    const token = await createClickToken(PAYLOAD);
    const tampered = token.slice(0, -4) + (token.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA');
    expect(await decodeClickToken(tampered)).toBeNull();
  });

  it('rejects a token encrypted with a different key', async () => {
    const token = await createClickToken(PAYLOAD);
    mockGetMarketingClickTokenSecret.mockResolvedValue({ encryptionKey: 'a-completely-different-secret' });
    expect(await decodeClickToken(token)).toBeNull();
  });

  it('rejects garbage input rather than throwing', async () => {
    expect(await decodeClickToken('not-a-real-token')).toBeNull();
  });
});
