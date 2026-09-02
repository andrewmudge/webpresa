/**
 * Unit tests for `computeKpis` — in particular, that `postcardsDelivered`
 * (a true count of Lob-confirmed `Postcard.status === 'delivered'` records)
 * and `businessesEnrolled` (a count of `MarketingOutreach` rows) are
 * independent numbers that can legitimately diverge. Fixed after a real
 * prod discrepancy report: the dashboard previously labeled the enrollment
 * count "Postcards Delivered," which misrepresented what it counted.
 */
import { describe, it, expect, vi } from 'vitest';

// `computeKpis` itself is pure, but the module also imports several
// `server-only`/DB modules at the top level (used by the untested
// `getMarketingDashboardData`) — mocked here purely so importing the module
// doesn't execute real AWS SDK/server-only side effects, mirroring
// `lib/ai/__tests__/generate-preview.test.ts`'s boundary-mocking style.
vi.mock('server-only', () => ({}));
vi.mock('@/lib/marketing/campaign', () => ({ ensureMarketingCampaignExists: vi.fn() }));
vi.mock('@/lib/db/marketing-outreach', () => ({ listOutreachForCampaign: vi.fn() }));
vi.mock('@/lib/db/marketing-messages', () => ({ listAllMarketingMessages: vi.fn() }));
vi.mock('@/lib/db/businesses', () => ({ listAllBusinesses: vi.fn() }));
vi.mock('@/lib/db/postcards', () => ({ listAllPostcards: vi.fn() }));

import { computeKpis } from '@/lib/marketing/dashboard';
import type { OutreachRow } from '@/lib/marketing/dashboard';
import type { Postcard } from '@/domain/models/postcard';
import type { MarketingMessage } from '@/domain/models/marketing-message';
import type { MarketingOutreach } from '@/domain/models/marketing-outreach';

function makePostcard(overrides: Partial<Postcard> = {}): Postcard {
  return {
    postcardId: 'postcard_1',
    businessId: 'biz_1',
    previewId: 'preview_1',
    provider: 'lob',
    status: 'delivered',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeOutreachRow(overrides: Partial<MarketingOutreach> = {}): OutreachRow {
  const outreach: MarketingOutreach = {
    businessId: 'biz_1',
    marketingCampaignId: 'campaign_1',
    postcardId: 'postcard_1',
    deliveredAt: '2026-08-01T00:00:00.000Z',
    status: 'active',
    currentSequence: 0,
    sendAttemptCount: 0,
    unsubscribeToken: 'token',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
  return { outreach, business: null, messages: [] };
}

const NO_MESSAGES: MarketingMessage[] = [];

describe('computeKpis', () => {
  it('counts postcardsDelivered from real Postcard records with status "delivered" only', () => {
    const postcards = [
      makePostcard({ postcardId: 'p1', status: 'delivered' }),
      makePostcard({ postcardId: 'p2', status: 'delivered' }),
      makePostcard({ postcardId: 'p3', status: 'mailed' }),
      makePostcard({ postcardId: 'p4', status: 'submitted' }),
      makePostcard({ postcardId: 'p5', status: 'failed' }),
    ];

    const kpis = computeKpis([], NO_MESSAGES, postcards);

    expect(kpis.postcardsDelivered).toBe(2);
  });

  it('counts businessesEnrolled from MarketingOutreach rows, independent of Postcard data', () => {
    const rows = [makeOutreachRow({ businessId: 'biz_1' }), makeOutreachRow({ businessId: 'biz_2' })];

    const kpis = computeKpis(rows, NO_MESSAGES, []);

    expect(kpis.businessesEnrolled).toBe(2);
    expect(kpis.postcardsDelivered).toBe(0);
  });

  it('lets postcardsDelivered and businessesEnrolled diverge — the exact scenario reported in prod', () => {
    // 13 real delivered postcards, but only 4 businesses ever passed the
    // eligibility check at delivery time (already claimed, suppressed
    // email, etc. account for the other 9 — see campaign-start.ts /
    // eligibility.ts for the full list of legitimate exclusion reasons).
    const postcards = Array.from({ length: 13 }, (_, i) => makePostcard({ postcardId: `p${i}`, status: 'delivered' }));
    const rows = Array.from({ length: 4 }, (_, i) => makeOutreachRow({ businessId: `biz_${i}` }));

    const kpis = computeKpis(rows, NO_MESSAGES, postcards);

    expect(kpis.postcardsDelivered).toBe(13);
    expect(kpis.businessesEnrolled).toBe(4);
  });
});
