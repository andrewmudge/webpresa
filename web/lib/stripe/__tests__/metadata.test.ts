/**
 * Unit tests for trusted Stripe metadata construction/extraction (Stage 18).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildTrustedMetadata, extractBusinessId, extractBillingPurpose, resolveRuntimeEnvironment } from '@/lib/stripe/metadata';

describe('buildTrustedMetadata', () => {
  it('includes the required fields', () => {
    const metadata = buildTrustedMetadata({
      businessId: 'biz_1',
      ownerUserId: 'user_1',
      plan: 'basic',
      billingPurpose: 'website_subscription',
      environment: 'test',
    });
    expect(metadata).toEqual({
      businessId: 'biz_1',
      ownerUserId: 'user_1',
      plan: 'basic',
      billingPurpose: 'website_subscription',
      environment: 'test',
    });
  });

  it('includes optional fields only when provided', () => {
    const metadata = buildTrustedMetadata({
      businessId: 'biz_1',
      ownerUserId: 'user_1',
      plan: 'growth',
      billingPurpose: 'website_subscription',
      environment: 'test',
      claimId: 'claim_1',
      termsVersion: 'v1',
      acceptedTermsAt: '2026-01-01T00:00:00.000Z',
    }) as Record<string, string>;
    expect(metadata.claimId).toBe('claim_1');
    expect(metadata.termsVersion).toBe('v1');
    expect(metadata.acceptedTermsAt).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('extractBusinessId / extractBillingPurpose', () => {
  it('extracts values from metadata', () => {
    expect(extractBusinessId({ businessId: 'biz_1' })).toBe('biz_1');
    expect(extractBillingPurpose({ billingPurpose: 'website_subscription' })).toBe('website_subscription');
  });

  it('returns undefined for missing/empty/null metadata', () => {
    expect(extractBusinessId(null)).toBeUndefined();
    expect(extractBusinessId(undefined)).toBeUndefined();
    expect(extractBusinessId({})).toBeUndefined();
  });
});

describe('resolveRuntimeEnvironment', () => {
  afterEach(() => {
    delete process.env.VERCEL_ENV;
    vi.unstubAllEnvs();
  });

  it('prefers VERCEL_ENV over NODE_ENV', () => {
    process.env.VERCEL_ENV = 'preview';
    vi.stubEnv('NODE_ENV', 'production');
    expect(resolveRuntimeEnvironment()).toBe('preview');
  });

  it('falls back to NODE_ENV when VERCEL_ENV is unset', () => {
    delete process.env.VERCEL_ENV;
    vi.stubEnv('NODE_ENV', 'test');
    expect(resolveRuntimeEnvironment()).toBe('test');
  });
});
