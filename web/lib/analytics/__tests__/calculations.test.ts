import { describe, it, expect } from 'vitest';
import type { Business } from '@/domain/models/business';
import {
  safeDivide,
  computeChangePct,
  normalizeToMonthlyCents,
  wasActiveAsOf,
  countActiveAsOf,
  mrrCentsAsOf,
  computeMrrTrend,
  computeMrrBreakdown,
  computeChurnRate,
  computeSubscriberMix,
  computeCustomerHealth,
} from '../calculations';
import type { ResolvedDateWindow } from '../dashboard-types';

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_1',
    slug: 'acme',
    name: 'Acme',
    industry: 'plumbing',
    source: 'manual',
    status: 'customer',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const WINDOW: ResolvedDateWindow = {
  start: '2026-07-01T00:00:00.000Z',
  end: '2026-08-01T00:00:00.000Z',
  previousStart: '2026-06-01T00:00:00.000Z',
  previousEnd: '2026-07-01T00:00:00.000Z',
  comparisonAvailable: true,
};

describe('safeDivide', () => {
  it('divides normally', () => {
    expect(safeDivide(10, 4)).toBe(2.5);
  });

  it('returns null on a zero denominator, never Infinity/NaN', () => {
    expect(safeDivide(10, 0)).toBeNull();
    expect(safeDivide(0, 0)).toBeNull();
  });
});

describe('computeChangePct', () => {
  it('computes normal percentage change', () => {
    expect(computeChangePct(120, 100)).toBeCloseTo(0.2);
    expect(computeChangePct(80, 100)).toBeCloseTo(-0.2);
  });

  it('returns null when previous is 0 — never a fabricated Infinity/100% swing', () => {
    expect(computeChangePct(5, 0)).toBeNull();
    expect(computeChangePct(0, 0)).toBeNull();
  });
});

describe('normalizeToMonthlyCents', () => {
  it('$375/yr Basic Annual normalizes to $31.25/mo (3125 cents), never the raw $375 (37500 cents)', () => {
    expect(normalizeToMonthlyCents('basic', 'annual')).toBe(3125);
  });

  it('monthly plan returns the plain monthly price', () => {
    expect(normalizeToMonthlyCents('basic', 'monthly')).toBe(3900);
    expect(normalizeToMonthlyCents('growth', 'monthly')).toBe(7900);
  });

  it('undefined billingInterval (predates the field) is treated as monthly', () => {
    expect(normalizeToMonthlyCents('basic', undefined)).toBe(3900);
  });

  it('undefined plan returns 0', () => {
    expect(normalizeToMonthlyCents(undefined, 'monthly')).toBe(0);
  });

  it('an annual interval on a plan with no configured annual price (growth) safely returns 0', () => {
    expect(normalizeToMonthlyCents('growth', 'annual')).toBe(0);
  });
});

describe('wasActiveAsOf', () => {
  const NOW = '2026-09-15T00:00:00.000Z'; // later than every asOfIso below, so these exercise the past-instant branch unless noted

  it('right now (asOfIso >= nowIso), a currently-active business counts even with NO recorded firstPaidAt', () => {
    // Regression: a business that became a paying customer before the
    // firstPaidAt field shipped must never be invisible to "Active
    // Customers"/"Current MRR" just because history wasn't backfilled.
    const b = makeBusiness({ firstPaidAt: undefined, subscriptionStatus: 'active' });
    expect(wasActiveAsOf(b, NOW, NOW)).toBe(true);
  });

  it('a PAST instant, a currently-active business with no recorded firstPaidAt is excluded (honest gap, not fabricated)', () => {
    const b = makeBusiness({ firstPaidAt: undefined, subscriptionStatus: 'active' });
    expect(wasActiveAsOf(b, '2026-08-01T00:00:00.000Z', NOW)).toBe(false);
  });

  it('a canceled business with no recorded firstPaidAt is never counted active, at any instant (no live truth to fall back to)', () => {
    const b = makeBusiness({ firstPaidAt: undefined, subscriptionStatus: 'canceled' });
    expect(wasActiveAsOf(b, NOW, NOW)).toBe(false);
    expect(wasActiveAsOf(b, '2026-08-01T00:00:00.000Z', NOW)).toBe(false);
  });

  it('false when firstPaidAt is after the as-of instant (a past reconstruction with a known, later start date)', () => {
    const b = makeBusiness({ firstPaidAt: '2026-09-01T00:00:00.000Z', subscriptionStatus: 'active' });
    expect(wasActiveAsOf(b, '2026-08-01T00:00:00.000Z', NOW)).toBe(false);
  });

  it('true for a past instant when firstPaidAt is known and predates it, regardless of a stale canceledAt from a prior cycle', () => {
    const b = makeBusiness({ firstPaidAt: '2026-01-01T00:00:00.000Z', subscriptionStatus: 'active', canceledAt: '2026-03-01T00:00:00.000Z' });
    expect(wasActiveAsOf(b, '2026-08-01T00:00:00.000Z', NOW)).toBe(true);
    // Documented limitation: this also reports "active" for a point in time
    // (Feb) that was actually inside the cancellation gap — accepted since
    // no full subscription-event history is retained.
    expect(wasActiveAsOf(b, '2026-02-01T00:00:00.000Z', NOW)).toBe(true);
  });

  it('true for a canceled business at a point in time before its cancellation', () => {
    const b = makeBusiness({ firstPaidAt: '2026-01-01T00:00:00.000Z', subscriptionStatus: 'canceled', canceledAt: '2026-06-01T00:00:00.000Z' });
    expect(wasActiveAsOf(b, '2026-03-01T00:00:00.000Z', NOW)).toBe(true);
  });

  it('false for a canceled business at a point in time after its cancellation', () => {
    const b = makeBusiness({ firstPaidAt: '2026-01-01T00:00:00.000Z', subscriptionStatus: 'canceled', canceledAt: '2026-06-01T00:00:00.000Z' });
    expect(wasActiveAsOf(b, '2026-07-01T00:00:00.000Z', NOW)).toBe(false);
  });

  it('false for past_due (never counted as active for MRR/health purposes) even right now', () => {
    const b = makeBusiness({ firstPaidAt: '2026-01-01T00:00:00.000Z', subscriptionStatus: 'past_due' });
    expect(wasActiveAsOf(b, NOW, NOW)).toBe(false);
  });
});

describe('countActiveAsOf / mrrCentsAsOf', () => {
  const NOW = '2026-08-01T00:00:00.000Z';
  const businesses = [
    makeBusiness({ businessId: 'biz_1', firstPaidAt: '2026-01-01T00:00:00.000Z', subscriptionStatus: 'active', plan: 'basic', billingInterval: 'monthly' }),
    makeBusiness({
      businessId: 'biz_2',
      firstPaidAt: '2026-01-01T00:00:00.000Z',
      subscriptionStatus: 'active',
      plan: 'basic',
      billingInterval: 'annual',
    }),
    makeBusiness({ businessId: 'biz_3', firstPaidAt: undefined, subscriptionStatus: undefined }),
  ];

  it('counts only businesses active as of the given instant', () => {
    expect(countActiveAsOf(businesses, NOW, NOW)).toBe(2);
  });

  it('sums normalized monthly cents across active businesses', () => {
    expect(mrrCentsAsOf(businesses, NOW, NOW)).toBe(3900 + 3125);
  });

  it('counts a currently-active business with no firstPaidAt (pre-instrumentation) toward the current total', () => {
    const withUninstrumented = [...businesses, makeBusiness({ businessId: 'biz_4', firstPaidAt: undefined, subscriptionStatus: 'active', plan: 'basic', billingInterval: 'monthly' })];
    expect(countActiveAsOf(withUninstrumented, NOW, NOW)).toBe(3);
    expect(mrrCentsAsOf(withUninstrumented, NOW, NOW)).toBe(3900 + 3125 + 3900);
  });
});

describe('computeMrrTrend', () => {
  it('one point per month intersecting the window, matching the live MRR on the most recent point', () => {
    const now = new Date('2026-08-15T00:00:00.000Z');
    const businesses = [makeBusiness({ businessId: 'biz_1', firstPaidAt: '2026-06-10T00:00:00.000Z', subscriptionStatus: 'active', plan: 'basic', billingInterval: 'monthly' })];
    const window: ResolvedDateWindow = { start: '2026-06-01T00:00:00.000Z', end: now.toISOString(), comparisonAvailable: false };

    const trend = computeMrrTrend(businesses, window, now);

    expect(trend).toHaveLength(3); // Jun, Jul, Aug
    // firstPaidAt (Jun 10) predates every month-end point below, so the
    // business is active — and contributing MRR — for all three.
    expect(trend[0].mrrCents).toBe(3900);
    expect(trend[1].mrrCents).toBe(3900);
    expect(trend[2].mrrCents).toBe(3900);
    expect(trend[2].monthEnd).toBe(now.toISOString()); // current month capped at "now", not the calendar month-end
  });

  it('returns [] for an empty/invalid window', () => {
    const window: ResolvedDateWindow = { start: '2026-08-01T00:00:00.000Z', end: '2026-08-01T00:00:00.000Z', comparisonAvailable: false };
    expect(computeMrrTrend([], window)).toEqual([]);
  });

  it('clamps the start to the earliest firstPaidAt for an "all time" window, not the Unix epoch', () => {
    const now = new Date('2026-08-15T00:00:00.000Z');
    const businesses = [makeBusiness({ firstPaidAt: '2026-07-01T00:00:00.000Z', subscriptionStatus: 'active', plan: 'basic', billingInterval: 'monthly' })];
    const window: ResolvedDateWindow = { start: new Date(0).toISOString(), end: now.toISOString(), comparisonAvailable: false };

    const trend = computeMrrTrend(businesses, window, now);

    expect(trend).toHaveLength(2); // Jul, Aug — not 668 months back to 1970
  });

  it('clamps to the current month only when NO business has a recorded firstPaidAt (pre-instrumentation customers)', () => {
    const now = new Date('2026-08-15T00:00:00.000Z');
    const businesses = [makeBusiness({ firstPaidAt: undefined, subscriptionStatus: 'active', plan: 'basic', billingInterval: 'monthly' })];
    const window: ResolvedDateWindow = { start: new Date(0).toISOString(), end: now.toISOString(), comparisonAvailable: false };

    const trend = computeMrrTrend(businesses, window, now);

    expect(trend).toHaveLength(1); // just August — not hundreds of empty months back to 1970
    expect(trend[0].mrrCents).toBe(3900); // still shows the one real, live data point we have
  });
});

describe('computeMrrBreakdown', () => {
  const now = new Date('2026-08-15T00:00:00.000Z');

  it('computes new/churned/net-new MRR from firstPaidAt/canceledAt within the window', () => {
    const businesses = [
      makeBusiness({ businessId: 'new_1', firstPaidAt: '2026-07-10T00:00:00.000Z', subscriptionStatus: 'active', plan: 'basic', billingInterval: 'monthly' }),
      makeBusiness({
        businessId: 'churned_1',
        firstPaidAt: '2026-01-01T00:00:00.000Z',
        canceledAt: '2026-07-15T00:00:00.000Z',
        subscriptionStatus: 'canceled',
        plan: 'basic',
        billingInterval: 'monthly',
      }),
      makeBusiness({
        businessId: 'unrelated_1',
        firstPaidAt: '2026-01-01T00:00:00.000Z',
        subscriptionStatus: 'active',
        plan: 'basic',
        billingInterval: 'annual',
      }),
    ];

    const revenue = computeMrrBreakdown(businesses, WINDOW, now);

    expect(revenue.newMrrCents).toBe(3900);
    expect(revenue.churnedMrrCents).toBe(3900);
    expect(revenue.netNewMrrCents).toBe(0);
    expect(revenue.currentMrrCents).toBe(3900 + 3125); // new_1 + unrelated_1, churned_1 excluded
    expect(revenue.arrCents).toBe(revenue.currentMrrCents * 12);
  });

  it('a same-period churn-then-resubscribe does not get double-counted as both churned and new incorrectly', () => {
    // canceledAt inside the window but subscriptionStatus is active again (resubscribed) — must NOT count as churned.
    const businesses = [
      makeBusiness({
        businessId: 'resubscribed_1',
        firstPaidAt: '2026-01-01T00:00:00.000Z',
        canceledAt: '2026-07-05T00:00:00.000Z',
        subscriptionStatus: 'active',
        plan: 'basic',
        billingInterval: 'monthly',
      }),
    ];
    const revenue = computeMrrBreakdown(businesses, WINDOW, now);
    expect(revenue.churnedMrrCents).toBe(0);
  });

  it('currentMrrCents includes a currently-active business with no recorded firstPaidAt', () => {
    const businesses = [makeBusiness({ firstPaidAt: undefined, subscriptionStatus: 'active', plan: 'basic', billingInterval: 'monthly' })];
    const revenue = computeMrrBreakdown(businesses, WINDOW, now);
    expect(revenue.currentMrrCents).toBe(3900);
    expect(revenue.arrCents).toBe(3900 * 12);
  });
});

describe('computeChurnRate', () => {
  it('divides canceled by active-at-period-start', () => {
    expect(computeChurnRate(2, 20)).toBe(0.1);
  });

  it('returns null when nobody was active at period start', () => {
    expect(computeChurnRate(0, 0)).toBeNull();
  });
});

describe('computeSubscriberMix', () => {
  it('counts only active subscriptions, split by billing interval', () => {
    const businesses = [
      makeBusiness({ businessId: 'b1', subscriptionStatus: 'active', billingInterval: 'monthly' }),
      makeBusiness({ businessId: 'b2', subscriptionStatus: 'active', billingInterval: 'monthly' }),
      makeBusiness({ businessId: 'b3', subscriptionStatus: 'active', billingInterval: 'annual' }),
      makeBusiness({ businessId: 'b4', subscriptionStatus: 'canceled', billingInterval: 'monthly' }),
      makeBusiness({ businessId: 'b5', subscriptionStatus: 'past_due', billingInterval: 'annual' }),
    ];

    const mix = computeSubscriberMix(businesses);

    expect(mix).toEqual({ status: 'ok', monthlyCount: 2, annualCount: 1, monthlyPct: 2 / 3, annualPct: 1 / 3 });
  });

  it('returns an empty state instead of NaN% when there are no active subscribers', () => {
    expect(computeSubscriberMix([])).toEqual({ status: 'empty' });
    expect(computeSubscriberMix([makeBusiness({ subscriptionStatus: 'canceled', billingInterval: 'monthly' })])).toEqual({ status: 'empty' });
  });
});

describe('computeCustomerHealth', () => {
  const now = new Date('2026-08-15T00:00:00.000Z');

  it('computes new/canceled/net-growth/churn for the window', () => {
    const businesses = [
      makeBusiness({ businessId: 'active_before', firstPaidAt: '2026-01-01T00:00:00.000Z', subscriptionStatus: 'active' }),
      makeBusiness({ businessId: 'new_in_window', firstPaidAt: '2026-07-10T00:00:00.000Z', subscriptionStatus: 'active' }),
      makeBusiness({
        businessId: 'canceled_in_window',
        firstPaidAt: '2026-02-01T00:00:00.000Z',
        canceledAt: '2026-07-20T00:00:00.000Z',
        subscriptionStatus: 'canceled',
      }),
    ];

    const health = computeCustomerHealth(businesses, WINDOW, now);

    expect(health.activeCustomers).toBe(2); // active_before + new_in_window
    expect(health.newCustomers).toBe(1);
    expect(health.canceledCustomers).toBe(1);
    expect(health.netGrowth).toBe(0);
    expect(health.churnRate).toBe(0.5); // 1 canceled / 2 active at period start (active_before + canceled_in_window)
  });

  it('activeCustomers includes a currently-active business with no recorded firstPaidAt, but activeAtPeriodStart (churn denominator) excludes it since its start is unknown', () => {
    const businesses = [makeBusiness({ firstPaidAt: undefined, subscriptionStatus: 'active' })];
    const health = computeCustomerHealth(businesses, WINDOW, now);
    expect(health.activeCustomers).toBe(1);
    expect(health.churnRate).toBeNull(); // 0 canceled / 0 known-active-at-period-start
  });
});
