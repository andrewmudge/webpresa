/**
 * Unit tests for Stripe subscription status/snapshot reconciliation (Stage 18).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type Stripe from 'stripe';

vi.mock('server-only', () => ({}));

import { mapStripeStatusToAppStatus, mapStripeSubscriptionToAppState } from '@/lib/stripe/status-mapping';

/** Loosely-typed test fixture — only the fields status-mapping.ts actually reads. */
type PartialSubscription = Record<string, unknown>;

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.STRIPE_PRICE_ID_BASIC = 'price_basic_test';
  process.env.STRIPE_PRICE_ID_GROWTH = 'price_growth_test';
  process.env.STRIPE_PRICE_ID_BASIC_ANNUAL = 'price_basic_annual_test';
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('mapStripeStatusToAppStatus', () => {
  it('maps active to active', () => {
    expect(mapStripeStatusToAppStatus('active')).toBe('active');
  });

  it('does NOT map trialing to active — Webpresa never intentionally creates trials', () => {
    expect(mapStripeStatusToAppStatus('trialing')).toBeUndefined();
  });

  it('maps past_due, unpaid, and paused to past_due', () => {
    expect(mapStripeStatusToAppStatus('past_due')).toBe('past_due');
    expect(mapStripeStatusToAppStatus('unpaid')).toBe('past_due');
    expect(mapStripeStatusToAppStatus('paused')).toBe('past_due');
  });

  it('maps canceled to canceled', () => {
    expect(mapStripeStatusToAppStatus('canceled')).toBe('canceled');
  });

  it('grants no entitlement for incomplete/incomplete_expired', () => {
    expect(mapStripeStatusToAppStatus('incomplete')).toBeUndefined();
    expect(mapStripeStatusToAppStatus('incomplete_expired')).toBeUndefined();
  });
});

function makeSubscription(overrides: PartialSubscription = {}): Stripe.Subscription {
  return {
    id: 'sub_123',
    status: 'active',
    cancel_at_period_end: false,
    items: {
      data: [
        {
          price: { id: 'price_basic_test' },
          current_period_end: 1893456000, // 2030-01-01
        },
      ],
    },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

describe('mapStripeSubscriptionToAppState', () => {
  it('maps a full active subscription snapshot', () => {
    const result = mapStripeSubscriptionToAppState(makeSubscription());
    expect(result).toMatchObject({
      subscriptionStatus: 'active',
      stripeRawStatus: 'active',
      cancelAtPeriodEnd: false,
      plan: 'basic',
      billingInterval: 'monthly',
      stripeSubscriptionId: 'sub_123',
    });
    expect(result.currentPeriodEnd).toBe(new Date(1893456000 * 1000).toISOString());
  });

  it('resolves the growth plan from its price ID', () => {
    const result = mapStripeSubscriptionToAppState(
      makeSubscription({ items: { data: [{ price: { id: 'price_growth_test' }, current_period_end: 1893456000 }] } }),
    );
    expect(result.plan).toBe('growth');
  });

  it('resolves annual billing interval from an annual price ID, plan unchanged', () => {
    const result = mapStripeSubscriptionToAppState(
      makeSubscription({ items: { data: [{ price: { id: 'price_basic_annual_test' }, current_period_end: 1893456000 }] } }),
    );
    expect(result.plan).toBe('basic');
    expect(result.billingInterval).toBe('annual');
  });

  it('leaves plan and billingInterval undefined for an unrecognized price ID', () => {
    const result = mapStripeSubscriptionToAppState(
      makeSubscription({ items: { data: [{ price: { id: 'price_unknown' }, current_period_end: 1893456000 }] } }),
    );
    expect(result.plan).toBeUndefined();
    expect(result.billingInterval).toBeUndefined();
  });

  it('preserves cancel_at_period_end while status stays active — scheduled, not completed, cancellation', () => {
    const result = mapStripeSubscriptionToAppState(makeSubscription({ cancel_at_period_end: true }));
    expect(result.subscriptionStatus).toBe('active');
    expect(result.cancelAtPeriodEnd).toBe(true);
  });

  it('treats a non-null cancel_at as a scheduled cancellation even when cancel_at_period_end is false — the real Customer Portal cancellation shape (2026-08-20 production bug)', () => {
    const result = mapStripeSubscriptionToAppState(
      makeSubscription({ cancel_at_period_end: false, cancel_at: 1789870155, canceled_at: 1787192858 }),
    );
    expect(result.subscriptionStatus).toBe('active');
    expect(result.cancelAtPeriodEnd).toBe(true);
  });

  it('does not treat a null cancel_at as a scheduled cancellation', () => {
    const result = mapStripeSubscriptionToAppState(makeSubscription({ cancel_at_period_end: false, cancel_at: null }));
    expect(result.cancelAtPeriodEnd).toBe(false);
  });

  it('maps a fully canceled subscription', () => {
    const result = mapStripeSubscriptionToAppState(makeSubscription({ status: 'canceled' }));
    expect(result.subscriptionStatus).toBe('canceled');
    expect(result.stripeRawStatus).toBe('canceled');
  });

  it('logs an anomaly and grants no entitlement for a trialing subscription', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = mapStripeSubscriptionToAppState(makeSubscription({ status: 'trialing' }));
    expect(result.subscriptionStatus).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
