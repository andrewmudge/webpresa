/**
 * Domain-layer tests for Stage 17 (Website Claim Flow): the new Claim
 * record/factory, the additive Business ownership fields
 * (ownerUserId/claimedAt), and the claim-banner state derivation.
 */
import { describe, it, expect } from 'vitest';
import { createBusiness } from '@/domain/factories/business.factory';
import { createClaim, CLAIM_DEFAULT_TTL_MS } from '@/domain/factories/claim.factory';
import { ClaimSchema } from '@/domain/schemas/claim.schema';
import { BusinessSchema } from '@/domain/schemas/business.schema';
import { getClaimBannerState } from '@/lib/claim/banner-state';

describe('Claim factory', () => {
  it('creates an issued claim with a claim_ id and a future expiresAt', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const claim = createClaim({ businessId: biz.businessId, tokenHash: 'a'.repeat(64) });

    expect(claim.claimId).toMatch(/^claim_/);
    expect(claim.status).toBe('issued');
    expect(claim.businessId).toBe(biz.businessId);
    expect(new Date(claim.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(new Date(claim.expiresAt).getTime()).toBeLessThanOrEqual(Date.now() + CLAIM_DEFAULT_TTL_MS + 1000);
    expect(claim.consumedByUserId).toBeUndefined();
    expect(() => ClaimSchema.parse(claim)).not.toThrow();
  });

  it('accepts an explicit expiresAt override', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const explicitExpiry = new Date(Date.now() + 1000).toISOString();
    const claim = createClaim({ businessId: biz.businessId, tokenHash: 'b'.repeat(64), expiresAt: explicitExpiry });
    expect(claim.expiresAt).toBe(explicitExpiry);
  });

  it('rejects a malformed tokenHash (not 64 hex chars)', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    expect(() => createClaim({ businessId: biz.businessId, tokenHash: 'not-a-hash' })).toThrow();
  });

  it('accepts a terminal, consumed claim with consumedByUserId/consumedAt set', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const claim = createClaim({ businessId: biz.businessId, tokenHash: 'c'.repeat(64) });
    const consumed = {
      ...claim,
      status: 'consumed' as const,
      consumedByUserId: 'cognito-sub-123',
      consumedAt: new Date().toISOString(),
    };
    expect(() => ClaimSchema.parse(consumed)).not.toThrow();
  });
});

describe('Business ownership fields (additive)', () => {
  it('a Business with no ownerUserId/claimedAt remains valid (unclaimed)', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    expect(biz.ownerUserId).toBeUndefined();
    expect(() => BusinessSchema.parse(biz)).not.toThrow();
  });

  it('a Business with ownerUserId/claimedAt set is valid (claimed)', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const claimed = { ...biz, ownerUserId: 'cognito-sub-123', claimedAt: new Date().toISOString() };
    expect(() => BusinessSchema.parse(claimed)).not.toThrow();
  });
});

describe('getClaimBannerState', () => {
  it('returns "unclaimed" when ownerUserId is absent', () => {
    expect(getClaimBannerState({ ownerUserId: undefined, subscriptionStatus: undefined, source: 'manual' })).toBe('unclaimed');
  });

  it('returns "claimed_pending" when claimed but not yet subscribed', () => {
    expect(getClaimBannerState({ ownerUserId: 'cognito-sub-123', subscriptionStatus: undefined, source: 'manual' })).toBe('claimed_pending');
  });

  it('returns "claimed_pending" (not "active") for past_due — a billing_recovery business must not look fully active', () => {
    expect(getClaimBannerState({ ownerUserId: 'cognito-sub-123', subscriptionStatus: 'past_due', source: 'manual' })).toBe('claimed_pending');
  });

  it('returns "claimed_pending" for canceled', () => {
    expect(getClaimBannerState({ ownerUserId: 'cognito-sub-123', subscriptionStatus: 'canceled', source: 'manual' })).toBe('claimed_pending');
  });

  it('returns "active" once genuinely paid — subscriptionStatus === active', () => {
    expect(getClaimBannerState({ ownerUserId: 'cognito-sub-123', subscriptionStatus: 'active', source: 'manual' })).toBe('active');
  });
});
