/**
 * Unit tests for Stripe Price ID mapping (Stage 18).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

import { resolvePriceId, resolvePlanFromPriceId } from '@/lib/stripe/plans';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.STRIPE_PRICE_ID_BASIC = 'price_basic_test';
  process.env.STRIPE_PRICE_ID_GROWTH = 'price_growth_test';
  process.env.STRIPE_PRICE_ID_BASIC_ANNUAL = 'price_basic_annual_test';
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('resolvePriceId', () => {
  it('resolves the Basic price ID', () => {
    expect(resolvePriceId('basic')).toBe('price_basic_test');
  });

  it('resolves the Growth price ID', () => {
    expect(resolvePriceId('growth')).toBe('price_growth_test');
  });

  it('defaults to monthly when no interval is passed', () => {
    expect(resolvePriceId('basic')).toBe(resolvePriceId('basic', 'monthly'));
  });

  it('resolves the annual Basic price ID', () => {
    expect(resolvePriceId('basic', 'annual')).toBe('price_basic_annual_test');
  });

  it('throws when the env var is missing', () => {
    delete process.env.STRIPE_PRICE_ID_BASIC;
    expect(() => resolvePriceId('basic')).toThrow('STRIPE_PRICE_ID_BASIC');
  });

  it('throws a distinct error when the annual env var is missing', () => {
    delete process.env.STRIPE_PRICE_ID_BASIC_ANNUAL;
    expect(() => resolvePriceId('basic', 'annual')).toThrow('STRIPE_PRICE_ID_BASIC_ANNUAL');
  });
});

describe('resolvePlanFromPriceId', () => {
  it('reverse-maps a known Price ID back to its plan', () => {
    expect(resolvePlanFromPriceId('price_basic_test')).toBe('basic');
    expect(resolvePlanFromPriceId('price_growth_test')).toBe('growth');
  });

  it('reverse-maps an annual Price ID to the same plan as its monthly counterpart', () => {
    expect(resolvePlanFromPriceId('price_basic_annual_test')).toBe('basic');
  });

  it('returns undefined for an unrecognized Price ID', () => {
    expect(resolvePlanFromPriceId('price_unknown')).toBeUndefined();
  });
});
