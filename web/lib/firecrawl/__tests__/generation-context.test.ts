/**
 * Unit tests for buildGenerationContext — the merge-precedence function.
 * Pure function, no mocking needed.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildGenerationContext } from '../generation-context';
import type { Business } from '@/domain/models/business';
import type { WebsiteEnrichmentSnapshot } from '@/domain/models/website-enrichment';

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_00000000-0000-0000-0000-000000000001',
    slug: 'acme-plumbing',
    name: 'Acme Plumbing',
    industry: 'plumbing',
    source: 'manual',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<WebsiteEnrichmentSnapshot> = {}): WebsiteEnrichmentSnapshot {
  return {
    schemaVersion: '1',
    sourceUrl: 'https://example.com/',
    services: [],
    serviceAreas: [],
    faq: [],
    navigationLabels: [],
    callsToAction: [],
    contact: { phones: [], emails: [], addresses: [] },
    socialLinks: [],
    links: [],
    imageReferences: [],
    extractedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('buildGenerationContext', () => {
  it('uses the business own services when present, ignoring the snapshot entirely', () => {
    const business = makeBusiness({ servicesOffered: 'Drain cleaning\nWater heater repair' });
    const snapshot = makeSnapshot({ services: [{ name: 'Sewer Line Repair' }] });
    const ctx = buildGenerationContext({ business, snapshot });
    expect(ctx.servicesLines).toEqual(['Drain cleaning', 'Water heater repair']);
    expect(ctx.usedEnrichmentFallback).toBe(false);
  });

  it('falls back to snapshot services when the business left the field blank', () => {
    const business = makeBusiness({ servicesOffered: undefined });
    const snapshot = makeSnapshot({ services: [{ name: 'Sewer Line Repair' }, { name: 'Leak Detection' }] });
    const ctx = buildGenerationContext({ business, snapshot });
    expect(ctx.servicesLines).toEqual(['Sewer Line Repair', 'Leak Detection']);
    expect(ctx.usedEnrichmentFallback).toBe(true);
  });

  it('returns no services when both the business and snapshot are empty', () => {
    const business = makeBusiness();
    const ctx = buildGenerationContext({ business, snapshot: undefined });
    expect(ctx.servicesLines).toEqual([]);
  });

  it('business description wins outright over the snapshot summary/about', () => {
    const business = makeBusiness({ description: 'Owner-written description.' });
    const snapshot = makeSnapshot({ about: 'Scraped about text.', summary: 'Scraped summary.' });
    const ctx = buildGenerationContext({ business, snapshot });
    expect(ctx.description).toBe('Owner-written description.');
  });

  it('falls back to snapshot about, then summary, when business description is blank', () => {
    const business = makeBusiness({ description: undefined });
    const snapshotWithAbout = makeSnapshot({ about: 'Scraped about text.', summary: 'Scraped summary.' });
    expect(buildGenerationContext({ business, snapshot: snapshotWithAbout }).description).toBe('Scraped about text.');

    const snapshotSummaryOnly = makeSnapshot({ summary: 'Scraped summary.' });
    expect(buildGenerationContext({ business, snapshot: snapshotSummaryOnly }).description).toBe('Scraped summary.');
  });

  it('never mutates the passed-in Business object', () => {
    const business = makeBusiness({ servicesOffered: undefined });
    const snapshot = makeSnapshot({ services: [{ name: 'Sewer Line Repair' }] });
    const before = JSON.stringify(business);
    buildGenerationContext({ business, snapshot });
    expect(JSON.stringify(business)).toBe(before);
  });

  it('has no fallback for differentiators — Firecrawl has no equivalent field', () => {
    const business = makeBusiness({ differentiators: undefined });
    const snapshot = makeSnapshot({ services: [{ name: 'x' }] });
    const ctx = buildGenerationContext({ business, snapshot });
    expect(ctx.differentiatorLines).toEqual([]);
  });

  describe('contact fallback', () => {
    it('uses the business own phone/email when present, ignoring the snapshot', () => {
      const business = makeBusiness({ phone: '512-555-0100', email: 'owner@acme.com' });
      const snapshot = makeSnapshot({ contact: { phones: ['999-999-9999'], emails: ['found@acme.com'], addresses: [] } });
      const ctx = buildGenerationContext({ business, snapshot });
      expect(ctx.contact).toEqual({ phone: '512-555-0100', email: 'owner@acme.com' });
      expect(ctx.usedEnrichmentFallback).toBe(false);
    });

    it('falls back to the snapshot email when the business has none, without touching phone', () => {
      const business = makeBusiness({ phone: '512-555-0100', email: undefined });
      const snapshot = makeSnapshot({ contact: { phones: [], emails: ['aaa1paulsplumbing@yahoo.com'], addresses: [] } });
      const ctx = buildGenerationContext({ business, snapshot });
      expect(ctx.contact).toEqual({ phone: '512-555-0100', email: 'aaa1paulsplumbing@yahoo.com' });
      expect(ctx.usedEnrichmentFallback).toBe(true);
    });

    it('resolves phone, email, and address independently from the snapshot', () => {
      const business = makeBusiness();
      const snapshot = makeSnapshot({
        contact: { phones: ['512-555-0199'], emails: ['found@acme.com'], addresses: ['123 Main St, Austin, TX'] },
      });
      const ctx = buildGenerationContext({ business, snapshot });
      expect(ctx.contact).toEqual({ phone: '512-555-0199', email: 'found@acme.com', address: '123 Main St, Austin, TX' });
    });

    it('produces no contact fields at all when neither the business nor the snapshot has any', () => {
      const business = makeBusiness();
      const ctx = buildGenerationContext({ business, snapshot: undefined });
      expect(ctx.contact).toEqual({});
    });

    it('never mutates Business.email/phone even when a fallback is used', () => {
      const business = makeBusiness({ email: undefined });
      const snapshot = makeSnapshot({ contact: { phones: [], emails: ['found@acme.com'], addresses: [] } });
      buildGenerationContext({ business, snapshot });
      expect(business.email).toBeUndefined();
    });
  });
});
