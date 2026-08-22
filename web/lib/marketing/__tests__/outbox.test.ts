/**
 * Unit tests for the marketing outbox — the "Email N Sent" KPI cards link
 * here so an admin can see the actual sent email content across every
 * business, not just one at a time.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockListAllMarketingMessages, mockListAllBusinesses } = vi.hoisted(() => ({
  mockListAllMarketingMessages: vi.fn(),
  mockListAllBusinesses: vi.fn(),
}));

vi.mock('@/lib/db/marketing-messages', () => ({ listAllMarketingMessages: mockListAllMarketingMessages }));
vi.mock('@/lib/db/businesses', () => ({ listAllBusinesses: mockListAllBusinesses }));

import { getMarketingOutbox } from '../outbox';

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    messageId: 'mktgmsg_1',
    businessId: 'biz_1',
    marketingCampaignId: 'mktgcampaign_postcard_followup',
    emailSequence: 1,
    sortKey: 'mktgcampaign_postcard_followup#1',
    outcome: 'sent',
    attemptedAt: '2026-08-20T10:00:00.000Z',
    sentAt: '2026-08-20T10:00:00.000Z',
    clickCount: 0,
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
    ...overrides,
  };
}

const BUSINESS = { businessId: 'biz_1', name: 'Pensacola Plumbing Co.' };

beforeEach(() => {
  vi.clearAllMocks();
  mockListAllBusinesses.mockResolvedValue([BUSINESS]);
});

describe('getMarketingOutbox', () => {
  it('excludes skipped and failed messages', async () => {
    mockListAllMarketingMessages.mockResolvedValue([
      makeMessage({ outcome: 'sent', sortKey: 'a#1' }),
      makeMessage({ outcome: 'skipped', sortKey: 'a#2', emailSequence: 2 }),
      makeMessage({ outcome: 'failed', sortKey: 'a#3', emailSequence: 3 }),
    ]);
    const entries = await getMarketingOutbox();
    expect(entries).toHaveLength(1);
    expect(entries[0].message.outcome).toBe('sent');
  });

  it('filters by emailSequence when given', async () => {
    mockListAllMarketingMessages.mockResolvedValue([
      makeMessage({ emailSequence: 1, sortKey: 'a#1', sentAt: '2026-08-20T10:00:00.000Z' }),
      makeMessage({ emailSequence: 2, sortKey: 'a#2', sentAt: '2026-08-21T10:00:00.000Z' }),
    ]);
    const entries = await getMarketingOutbox({ emailSequence: 2 });
    expect(entries).toHaveLength(1);
    expect(entries[0].message.emailSequence).toBe(2);
  });

  it('joins the correct business', async () => {
    mockListAllMarketingMessages.mockResolvedValue([makeMessage()]);
    const entries = await getMarketingOutbox();
    expect(entries[0].business).toEqual(BUSINESS);
  });

  it('returns business: null when the business no longer exists', async () => {
    mockListAllBusinesses.mockResolvedValue([]);
    mockListAllMarketingMessages.mockResolvedValue([makeMessage()]);
    const entries = await getMarketingOutbox();
    expect(entries[0].business).toBeNull();
  });

  it('sorts newest sentAt first', async () => {
    mockListAllMarketingMessages.mockResolvedValue([
      makeMessage({ sortKey: 'a#1', sentAt: '2026-08-19T10:00:00.000Z' }),
      makeMessage({ sortKey: 'a#2', sentAt: '2026-08-21T10:00:00.000Z' }),
      makeMessage({ sortKey: 'a#3', sentAt: '2026-08-20T10:00:00.000Z' }),
    ]);
    const entries = await getMarketingOutbox();
    expect(entries.map((e) => e.message.sentAt)).toEqual([
      '2026-08-21T10:00:00.000Z',
      '2026-08-20T10:00:00.000Z',
      '2026-08-19T10:00:00.000Z',
    ]);
  });
});
