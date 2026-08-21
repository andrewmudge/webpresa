import type { Business } from '@/domain/models/business';
import type { WebpresaPlan, BillingInterval } from '@/domain/constants/plans';
import { PLAN_CATALOG } from '@/domain/constants/plan-catalog';
import type { ResolvedDateWindow, RevenueSummary, MrrTrendPoint, SubscriberMixResult, CustomerHealthResult } from './dashboard-types';

/**
 * Stage 29 — pure MRR/ARR/churn/subscriber-mix arithmetic, no I/O. This is
 * the unit-test core: every function here takes plain arrays/values in and
 * returns typed values out, so the calculation layer can be exercised
 * without mocking DynamoDB or Next.js.
 */

/** `null` on a zero denominator — never `NaN`/`Infinity`. */
export function safeDivide(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

/** `null` when `previous` is 0 — never a fabricated `Infinity`/`100%` swing off a zero baseline. */
export function computeChangePct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

/**
 * Annual-plan MRR normalization — e.g. Basic Annual ($375/yr, `annualPriceCents: 37500`)
 * normalizes to `3125` cents ($31.25/mo), never the raw `37500` ($375).
 * `billingInterval` absent (a subscription predating the field) is treated
 * as monthly — the only cadence that existed before annual billing shipped.
 * `annualPriceCents` absent for the resolved plan (Growth today, which has
 * no annual Price configured in Stripe) safely returns 0 rather than
 * fabricating a number — this combination can't occur from real Stripe data
 * today (Growth isn't purchasable at all), so 0 is a safe, inert default,
 * not a silently wrong one.
 */
export function normalizeToMonthlyCents(plan: WebpresaPlan | undefined, billingInterval: BillingInterval | undefined): number {
  if (!plan) return 0;
  const entry = PLAN_CATALOG[plan];
  if (billingInterval === 'annual') {
    return entry.annualPriceCents !== undefined ? Math.round(entry.annualPriceCents / 12) : 0;
  }
  return entry.monthlyPriceCents;
}

/**
 * Whether a business was an active paying customer at a specific point in
 * time, reconstructed from `firstPaidAt`/`canceledAt`/`subscriptionStatus`
 * (there is no full subscription-event history table — see
 * `domain/models/business.ts`'s `canceledAt` doc comment).
 *
 * Known, accepted limitation: `canceledAt` only ever retains the MOST
 * RECENT cancellation. A business that cancels and later resubscribes will
 * therefore appear continuously active for every point in time from
 * `firstPaidAt` onward once `subscriptionStatus` is `'active'` again — the
 * gap during which it was actually canceled is not reconstructable. This is
 * a narrow edge case for a brand-new SaaS with very few customers today,
 * accepted rather than building a full event-history table for this MVP.
 */
/**
 * `nowIso` distinguishes "am I asking about right now" from "am I asking
 * about a past instant" — the two need different fallback behavior when
 * `firstPaidAt` is missing:
 *
 * - **Right now** (`asOfIso >= nowIso`): `subscriptionStatus` is always the
 *   live, current truth (it's rewritten on every Stripe webhook,
 *   unconditionally) — a currently-active business is active right now
 *   whether or not `firstPaidAt` happens to be recorded. A business that
 *   became a customer before Stage 29's `firstPaidAt` field shipped (the
 *   webhook only sets it going forward, never retroactively) must never be
 *   invisible to "Active Customers"/"Current MRR" just because of when this
 *   feature happened to ship.
 * - **A past instant** (`asOfIso < nowIso`): only `firstPaidAt` can place a
 *   business there — without it, we genuinely don't know whether they were
 *   already a customer at that point, so they're excluded rather than
 *   assumed either way. This is the deliberate, honest gap: current state
 *   is always correct; un-instrumented history is admittedly incomplete,
 *   never fabricated.
 */
export function wasActiveAsOf(business: Pick<Business, 'firstPaidAt' | 'canceledAt' | 'subscriptionStatus'>, asOfIso: string, nowIso: string): boolean {
  const isCurrentInstant = asOfIso >= nowIso;

  if (business.subscriptionStatus === 'active') {
    if (isCurrentInstant) return true;
    return !!business.firstPaidAt && business.firstPaidAt <= asOfIso;
  }
  if (business.subscriptionStatus === 'canceled') {
    if (!business.firstPaidAt || business.firstPaidAt > asOfIso) return false;
    return !!business.canceledAt && business.canceledAt > asOfIso; // stale canceledAt from a prior cycle is ignored once active again
  }
  return false;
}

export function countActiveAsOf(businesses: Business[], asOfIso: string, nowIso: string): number {
  return businesses.filter((b) => wasActiveAsOf(b, asOfIso, nowIso)).length;
}

export function mrrCentsAsOf(businesses: Business[], asOfIso: string, nowIso: string): number {
  return businesses.filter((b) => wasActiveAsOf(b, asOfIso, nowIso)).reduce((sum, b) => sum + normalizeToMonthlyCents(b.plan, b.billingInterval), 0);
}

/** Defensive cap on `computeMrrTrend`'s month-by-month loop — 50 years, never actually reached at this app's scale. */
const MAX_TREND_MONTHS = 600;

/**
 * Reconstructed active MRR per calendar month-end intersecting the window
 * (confirmed design decision — not a "new MRR by cohort month" acquisition
 * chart, which would look consistent with itself but wouldn't actually show
 * whether recurring revenue is trending up or down, the chart's explicit
 * purpose). The current/most-recent point always matches the live
 * Current-MRR KPI exactly, since both call `mrrCentsAsOf` with the same
 * "now". Inherits `wasActiveAsOf`'s resubscribe-gap limitation.
 *
 * The iteration start is clamped to the earliest `firstPaidAt` on record
 * (never earlier than the window itself) so the `'all time'` preset, whose
 * window starts at the Unix epoch, doesn't walk decades of empty months. If
 * NO business has a recorded `firstPaidAt` at all (e.g. every currently-active
 * business predates that field), there's no historical anchor to reconstruct
 * past months from — the trend clamps to the current month only, showing the
 * one real, live data point we have rather than hundreds of misleadingly
 * empty bars back to the epoch.
 */
export function computeMrrTrend(businesses: Business[], window: ResolvedDateWindow, now: Date = new Date()): MrrTrendPoint[] {
  const nowIso = now.toISOString();
  const windowStart = new Date(window.start);
  const cappedEnd = new Date(Math.min(new Date(window.end).getTime(), now.getTime()));
  if (Number.isNaN(windowStart.getTime()) || cappedEnd.getTime() <= windowStart.getTime()) return [];

  const earliestPaidAtMs = businesses.reduce<number | null>((earliest, b) => {
    if (!b.firstPaidAt) return earliest;
    const t = new Date(b.firstPaidAt).getTime();
    return earliest === null || t < earliest ? t : earliest;
  }, null);
  const effectiveStart =
    earliestPaidAtMs !== null
      ? earliestPaidAtMs > windowStart.getTime()
        ? new Date(earliestPaidAtMs)
        : windowStart
      : new Date(Date.UTC(cappedEnd.getUTCFullYear(), cappedEnd.getUTCMonth(), 1));
  if (effectiveStart.getTime() > cappedEnd.getTime()) return [];

  const points: MrrTrendPoint[] = [];
  let cursor = new Date(Date.UTC(effectiveStart.getUTCFullYear(), effectiveStart.getUTCMonth(), 1));

  for (let i = 0; i < MAX_TREND_MONTHS && cursor.getTime() <= cappedEnd.getTime(); i++) {
    const monthEndCandidate = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1) - 1);
    const monthEnd = monthEndCandidate.getTime() < cappedEnd.getTime() ? monthEndCandidate : cappedEnd;
    points.push({
      monthLabel: monthEnd.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
      monthEnd: monthEnd.toISOString(),
      mrrCents: mrrCentsAsOf(businesses, monthEnd.toISOString(), nowIso),
    });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  return points;
}

/**
 * New/Churned/Net New MRR use each business's CURRENT `plan`/`billingInterval`,
 * not the price at signup — an accepted approximation (no price-history is
 * retained) that's harmless today since only one plan/cadence pair is
 * actually purchasable; revisit if/when a second purchasable plan or
 * self-service plan changes ship.
 */
export function computeMrrBreakdown(businesses: Business[], window: ResolvedDateWindow, now: Date = new Date()): RevenueSummary {
  const currentMrrCents = mrrCentsAsOf(businesses, now.toISOString(), now.toISOString());

  const newMrrCents = businesses
    .filter((b) => b.firstPaidAt && b.firstPaidAt >= window.start && b.firstPaidAt < window.end)
    .reduce((sum, b) => sum + normalizeToMonthlyCents(b.plan, b.billingInterval), 0);

  const churnedMrrCents = businesses
    .filter((b) => b.subscriptionStatus === 'canceled' && b.canceledAt && b.canceledAt >= window.start && b.canceledAt < window.end)
    .reduce((sum, b) => sum + normalizeToMonthlyCents(b.plan, b.billingInterval), 0);

  return {
    currentMrrCents,
    arrCents: currentMrrCents * 12,
    newMrrCents,
    churnedMrrCents,
    netNewMrrCents: newMrrCents - churnedMrrCents,
    trend: computeMrrTrend(businesses, window, now),
  };
}

export function computeChurnRate(canceledInPeriod: number, activeAtPeriodStart: number): number | null {
  return safeDivide(canceledInPeriod, activeAtPeriodStart);
}

/**
 * Active subscriptions only — a canceled/past-due subscription is never
 * part of the mix. Denominator is `monthlyCount + annualCount`, not
 * `active.length`: a `subscriptionStatus === 'active'` business with no
 * `billingInterval` (a record predating that field, never re-synced since)
 * is excluded from both buckets rather than silently folded into one,
 * surfacing the data gap instead of masking it.
 */
export function computeSubscriberMix(businesses: Business[]): SubscriberMixResult {
  const active = businesses.filter((b) => b.subscriptionStatus === 'active');
  const monthlyCount = active.filter((b) => b.billingInterval === 'monthly').length;
  const annualCount = active.filter((b) => b.billingInterval === 'annual').length;
  const total = monthlyCount + annualCount;
  if (total === 0) return { status: 'empty' };
  return { status: 'ok', monthlyCount, annualCount, monthlyPct: monthlyCount / total, annualPct: annualCount / total };
}

export function computeCustomerHealth(businesses: Business[], window: ResolvedDateWindow, now: Date = new Date()): CustomerHealthResult {
  const nowIso = now.toISOString();
  const activeCustomers = countActiveAsOf(businesses, nowIso, nowIso);
  const newCustomers = businesses.filter((b) => b.firstPaidAt && b.firstPaidAt >= window.start && b.firstPaidAt < window.end).length;
  const canceledCustomers = businesses.filter(
    (b) => b.subscriptionStatus === 'canceled' && b.canceledAt && b.canceledAt >= window.start && b.canceledAt < window.end,
  ).length;
  const activeAtPeriodStart = countActiveAsOf(businesses, window.start, nowIso);

  return {
    activeCustomers,
    newCustomers,
    canceledCustomers,
    netGrowth: newCustomers - canceledCustomers,
    churnRate: computeChurnRate(canceledCustomers, activeAtPeriodStart),
  };
}
