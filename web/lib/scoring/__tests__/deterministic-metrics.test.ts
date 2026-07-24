import { describe, it, expect, vi } from 'vitest';
import type { Business } from '@/domain/models/business';
import type { ScanEvent } from '@/domain/models/scan-event';
import type { WebsiteEnrichmentSnapshot } from '@/domain/models/website-enrichment';

vi.mock('server-only', () => ({}));

import { computeDeterministicMetrics } from '../deterministic-metrics';

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_00000000-0000-0000-0000-000000000001',
    slug: 'acme-plumbing',
    name: 'Acme Plumbing',
    industry: 'plumbing',
    source: 'google_places',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeFirecrawlScan(overrides: Partial<ScanEvent> = {}): ScanEvent {
  return {
    scanId: 'scan_11111111-1111-1111-1111-111111111111',
    businessId: 'biz_00000000-0000-0000-0000-000000000001',
    provider: 'firecrawl',
    operation: 'scrape',
    status: 'completed',
    attempt: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<WebsiteEnrichmentSnapshot> = {}): WebsiteEnrichmentSnapshot {
  return {
    schemaVersion: '1',
    sourceUrl: 'https://acmeplumbing.example.com',
    services: [],
    serviceAreas: [],
    differentiators: [],
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

describe('computeDeterministicMetrics — basics', () => {
  it('reports no website when websiteUrl is unset', () => {
    const metrics = computeDeterministicMetrics({ business: makeBusiness() });
    expect(metrics.websiteExists).toBe(false);
    expect(metrics.httpsEnabled).toBe(false);
  });

  it('derives httpsEnabled from the Firecrawl scan finalUrl when present, over the raw business URL', () => {
    const business = makeBusiness({ websiteUrl: 'http://acmeplumbing.example.com' });
    const firecrawlScan = makeFirecrawlScan({ finalUrl: 'https://acmeplumbing.example.com/' });

    const metrics = computeDeterministicMetrics({ business, firecrawlScan });

    expect(metrics.websiteExists).toBe(true);
    expect(metrics.httpsEnabled).toBe(true);
  });

  it('reports crawlSucceeded only when the Firecrawl scan completed', () => {
    const business = makeBusiness({ websiteUrl: 'https://acmeplumbing.example.com' });
    const failedScan = makeFirecrawlScan({ status: 'failed' });

    expect(computeDeterministicMetrics({ business, firecrawlScan: failedScan }).crawlSucceeded).toBe(false);
    expect(
      computeDeterministicMetrics({ business, firecrawlScan: makeFirecrawlScan({ status: 'completed' }) }).crawlSucceeded,
    ).toBe(true);
  });
});

describe('computeDeterministicMetrics — screenshot capture flags', () => {
  it('reflects per-viewport capture outcomes independently', () => {
    const business = makeBusiness();
    const screenshotScan: ScanEvent = {
      ...makeFirecrawlScan({ provider: 'playwright', operation: 'screenshot', targetType: 'existing_site' }),
      captureResults: {
        desktop: { status: 'completed', storageKey: 'scans/biz/scan/existing/desktop.png' },
        mobile: { status: 'failed', failureCategory: 'screenshot_failed' },
      },
    };

    const metrics = computeDeterministicMetrics({ business, screenshotScan });

    expect(metrics.desktopScreenshotCaptured).toBe(true);
    expect(metrics.mobileScreenshotCaptured).toBe(false);
  });
});

describe('computeDeterministicMetrics — snapshot-derived heuristics', () => {
  it('detects a contact form from a "contact"-labeled call to action', () => {
    const business = makeBusiness();
    const snapshot = makeSnapshot({ callsToAction: ['Contact Us Today'] });

    expect(computeDeterministicMetrics({ business, snapshot }).contactFormDetected).toBe(true);
  });

  it('does not detect a contact form when no contact-related evidence exists', () => {
    const business = makeBusiness();
    const snapshot = makeSnapshot({ callsToAction: ['Book Now'], navigationLabels: ['Home', 'Services'] });

    expect(computeDeterministicMetrics({ business, snapshot }).contactFormDetected).toBe(false);
  });

  it('detects hours from a time-of-day pattern in the about text', () => {
    const business = makeBusiness();
    const snapshot = makeSnapshot({ about: 'Open Monday-Friday 8am-5pm.' });

    expect(computeDeterministicMetrics({ business, snapshot }).hoursDetected).toBe(true);
  });

  it('leaves firecrawlExtractionConfidence undefined when there is no snapshot', () => {
    const metrics = computeDeterministicMetrics({ business: makeBusiness() });
    expect(metrics.firecrawlExtractionConfidence).toBeUndefined();
  });

  it('scores extraction confidence higher when more snapshot fields are populated', () => {
    const business = makeBusiness();
    const sparse = makeSnapshot();
    const rich = makeSnapshot({
      title: 'Acme Plumbing',
      metaDescription: 'Local plumber',
      businessName: 'Acme Plumbing',
      about: 'We fix pipes.',
      services: [{ name: 'Drain Cleaning' }],
      serviceAreas: ['Austin'],
      contact: { phones: ['512-555-0100'], emails: [], addresses: [] },
      imageReferences: [{ url: 'https://acmeplumbing.example.com/photo.jpg' }],
    });

    const sparseConfidence = computeDeterministicMetrics({ business, snapshot: sparse }).firecrawlExtractionConfidence ?? 0;
    const richConfidence = computeDeterministicMetrics({ business, snapshot: rich }).firecrawlExtractionConfidence ?? 0;

    expect(richConfidence).toBeGreaterThan(sparseConfidence);
  });
});

describe('computeDeterministicMetrics — Business-canonical fields', () => {
  it('prefers Business.phone/email over snapshot contact info, but still counts snapshot-only evidence as detected', () => {
    const business = makeBusiness({ phone: undefined, email: undefined });
    const snapshot = makeSnapshot({ contact: { phones: ['512-555-0100'], emails: ['hello@acme.com'], addresses: [] } });

    const metrics = computeDeterministicMetrics({ business, snapshot });

    expect(metrics.phoneDetected).toBe(true);
    expect(metrics.emailDetected).toBe(true);
  });

  it('reports googlePlacesDataAvailable from googlePlaceId, and passes through rating/review count', () => {
    const business = makeBusiness({ googlePlaceId: 'places/abc123', googleRating: 4.5, googleReviewCount: 120 });

    const metrics = computeDeterministicMetrics({ business });

    expect(metrics.googlePlacesDataAvailable).toBe(true);
    expect(metrics.googleRating).toBe(4.5);
    expect(metrics.googleReviewCount).toBe(120);
  });

  it('reports heroImageAvailable from heroPhotoUrl or any uploaded photo', () => {
    expect(computeDeterministicMetrics({ business: makeBusiness() }).heroImageAvailable).toBe(false);
    expect(
      computeDeterministicMetrics({ business: makeBusiness({ photoUrls: ['/api/assets/x.jpg'] }) }).heroImageAvailable,
    ).toBe(true);
  });
});
