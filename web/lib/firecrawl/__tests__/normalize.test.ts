/**
 * Unit tests for normalizeFirecrawlResponse. Pure function — no mocking needed.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { normalizeFirecrawlResponse } from '../normalize';
import type { FirecrawlScrapeData } from '../client';

function baseData(overrides: Partial<FirecrawlScrapeData> = {}): FirecrawlScrapeData {
  return {
    markdown: 'Welcome to Acme Plumbing.',
    links: ['https://example.com/about', 'https://facebook.com/acmeplumbing'],
    images: ['https://example.com/hero.jpg'],
    metadata: { title: 'Acme Plumbing', description: 'Local plumber', statusCode: 200, url: 'https://example.com/' },
    json: {
      businessName: 'Acme Plumbing',
      services: [{ name: 'Drain Cleaning', description: 'Fast service' }],
      serviceAreas: ['Austin', 'Round Rock'],
      faq: [{ question: 'Do you offer emergency service?', answer: 'Yes, 24/7.' }],
      contact: { phones: ['512-555-0100'], emails: ['hi@acme.com'], addresses: [] },
    },
    ...overrides,
  };
}

describe('normalizeFirecrawlResponse', () => {
  it('produces a valid snapshot from a well-formed response', () => {
    const snapshot = normalizeFirecrawlResponse({ sourceUrl: 'https://example.com/', data: baseData() });
    expect(snapshot.schemaVersion).toBe('1');
    expect(snapshot.services).toEqual([{ name: 'Drain Cleaning', description: 'Fast service' }]);
    expect(snapshot.serviceAreas).toEqual(['Austin', 'Round Rock']);
    expect(snapshot.contact.phones).toEqual(['512-555-0100']);
    expect(snapshot.contact.emails).toEqual(['hi@acme.com']);
  });

  it('derives social links from discovered page links even when the model omits them', () => {
    const snapshot = normalizeFirecrawlResponse({ sourceUrl: 'https://example.com/', data: baseData() });
    expect(snapshot.socialLinks).toContain('https://facebook.com/acmeplumbing');
  });

  it('dedupes social links that point at the same profile via www./trailing-slash variants', () => {
    const data = baseData({
      links: [
        'https://example.com/about',
        'https://facebook.com/acmeplumbing',
        'https://www.facebook.com/acmeplumbing/',
      ],
    });
    const snapshot = normalizeFirecrawlResponse({ sourceUrl: 'https://example.com/', data });
    expect(snapshot.socialLinks).toHaveLength(1);
    expect(snapshot.socialLinks[0]).toBe('https://facebook.com/acmeplumbing');
  });

  it('drops malformed URLs from links/images rather than throwing', () => {
    const data = baseData({ links: ['not-a-url', 'https://example.com/valid'], images: ['javascript:alert(1)'] });
    const snapshot = normalizeFirecrawlResponse({ sourceUrl: 'https://example.com/', data });
    expect(snapshot.links).toEqual([{ url: 'https://example.com/valid' }]);
    expect(snapshot.imageReferences).toEqual([]);
  });

  it('distinguishes missing fields from empty strings — omits title when absent', () => {
    const data = baseData({ metadata: { statusCode: 200 } });
    const snapshot = normalizeFirecrawlResponse({ sourceUrl: 'https://example.com/', data });
    expect(snapshot.title).toBeUndefined();
  });

  it('caps services to 20 entries', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ name: `Service ${i}` }));
    const data = baseData({ json: { services: many } });
    const snapshot = normalizeFirecrawlResponse({ sourceUrl: 'https://example.com/', data });
    expect(snapshot.services.length).toBe(20);
  });

  it('strips HTML-like markup from text fields', () => {
    const data = baseData({ json: { businessName: '<b>Acme</b> Plumbing' } });
    const snapshot = normalizeFirecrawlResponse({ sourceUrl: 'https://example.com/', data });
    expect(snapshot.businessName).toBe('Acme Plumbing');
  });

  it('handles a malformed/unexpected json extraction shape without throwing', () => {
    const data = baseData({ json: { services: 'not-an-array', unexpected: { deeply: { nested: true } } } });
    expect(() => normalizeFirecrawlResponse({ sourceUrl: 'https://example.com/', data })).not.toThrow();
  });

  it('rejects an invalid email in contact.emails rather than passing it through', () => {
    const data = baseData({ json: { contact: { emails: ['not-an-email', 'valid@example.com'] } } });
    const snapshot = normalizeFirecrawlResponse({ sourceUrl: 'https://example.com/', data });
    expect(snapshot.contact.emails).toEqual(['valid@example.com']);
  });

  it('produces deterministic, schema-valid output even from an empty response', () => {
    const snapshot = normalizeFirecrawlResponse({ sourceUrl: 'https://example.com/', data: { metadata: { statusCode: 200 } } });
    expect(snapshot.services).toEqual([]);
    expect(snapshot.serviceAreas).toEqual([]);
    expect(snapshot.contact).toEqual({ phones: [], emails: [], addresses: [] });
  });
});
