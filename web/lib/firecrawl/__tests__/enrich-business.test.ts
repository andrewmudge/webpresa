/**
 * Unit tests for the Stage 13 enrichment orchestration. Every external
 * dependency (DynamoDB repositories, S3, Firecrawl, OpenAI generation) is
 * mocked — no real network, AWS, or provider calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Business } from '@/domain/models/business';
import type { ScanEvent } from '@/domain/models/scan-event';
import type { SitePreview } from '@/domain/models/site-preview';

const {
  mockGetBusinessById,
  mockUpdateBusiness,
  mockGetScanEventById,
  mockListScansForBusiness,
  mockPutScanEvent,
  mockListPreviewsForBusiness,
  mockPutSitePreview,
  mockPutAsset,
  mockScrapeWebsite,
  mockValidateOutboundUrl,
  mockNormalizeFirecrawlResponse,
  mockIngestScanImages,
  mockGeneratePreviewContent,
} = vi.hoisted(() => ({
  mockGetBusinessById: vi.fn(),
  mockUpdateBusiness: vi.fn(),
  mockGetScanEventById: vi.fn(),
  mockListScansForBusiness: vi.fn(),
  mockPutScanEvent: vi.fn(),
  mockListPreviewsForBusiness: vi.fn(),
  mockPutSitePreview: vi.fn(),
  mockPutAsset: vi.fn(),
  mockScrapeWebsite: vi.fn(),
  mockValidateOutboundUrl: vi.fn(),
  mockNormalizeFirecrawlResponse: vi.fn(),
  mockIngestScanImages: vi.fn(),
  mockGeneratePreviewContent: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById, updateBusiness: mockUpdateBusiness }));
vi.mock('@/lib/db/scan-events', () => ({
  getScanEventById: mockGetScanEventById,
  listScansForBusiness: mockListScansForBusiness,
  putScanEvent: mockPutScanEvent,
}));
vi.mock('@/lib/db/site-previews', () => ({
  listPreviewsForBusiness: mockListPreviewsForBusiness,
  putSitePreview: mockPutSitePreview,
}));
vi.mock('@/lib/s3/assets', () => ({ putAsset: mockPutAsset }));
vi.mock('@/lib/ai/generate-preview', () => ({ generatePreviewContent: mockGeneratePreviewContent }));
vi.mock('@/lib/security/url-validation', () => ({ validateOutboundUrl: mockValidateOutboundUrl }));
vi.mock('../normalize', () => ({ normalizeFirecrawlResponse: mockNormalizeFirecrawlResponse }));
vi.mock('../images', () => ({ ingestScanImages: mockIngestScanImages }));

vi.mock('../client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../client')>();
  return { ...actual, scrapeWebsite: mockScrapeWebsite };
});

vi.mock('../retry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../retry')>();
  return {
    ...actual,
    // Instant retries in tests — real exponential backoff would slow the suite.
    computeAutomaticRetryDelayMs: (attempt: number) =>
      attempt <= actual.MAX_AUTOMATIC_RETRIES ? 0 : undefined,
  };
});

import { enrichBusinessWebsite, retryEnrichmentScan } from '../enrich-business';
import { FirecrawlApiError } from '../client';

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_00000000-0000-0000-0000-000000000001',
    slug: 'acme-plumbing',
    name: 'Acme Plumbing',
    industry: 'plumbing',
    source: 'google_places',
    status: 'pending',
    websiteUrl: 'https://acmeplumbing.example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const VALID_SNAPSHOT = {
  schemaVersion: '1' as const,
  sourceUrl: 'https://acmeplumbing.example.com',
  services: [{ name: 'Drain Cleaning' }],
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
};

const VALID_GENERATED = {
  content: {
    hero: { headline: 'Reliable Plumbing', subheadline: 'Fast local service', ctaText: 'Call Now' },
    services: [{ name: 'Drain Cleaning', description: 'Fast, thorough drain clearing.' }],
    tagline: 'Trusted local plumber.',
    aboutText: 'Acme has served the community for years.',
    contact: { phone: '512-555-0100' },
  },
  theme: { themeName: 'classicBlue' as const, fontFamily: 'system-ui' },
  metadata: {
    model: 'gpt-4o-mini',
    promptVersion: '2026-07-13',
    generatedAt: new Date().toISOString(),
    durationMs: 500,
    source: 'firecrawl_enriched' as const,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockListScansForBusiness.mockResolvedValue([]);
  mockUpdateBusiness.mockResolvedValue(undefined);
  mockPutScanEvent.mockResolvedValue(undefined);
  mockPutSitePreview.mockResolvedValue(undefined);
  mockPutAsset.mockResolvedValue(undefined);
  mockListPreviewsForBusiness.mockResolvedValue([]);
  mockValidateOutboundUrl.mockResolvedValue({ ok: true, normalizedUrl: 'https://acmeplumbing.example.com/' });
  mockScrapeWebsite.mockResolvedValue({
    markdown: 'Welcome to Acme Plumbing',
    links: [],
    images: [],
    json: {},
    metadata: { statusCode: 200, url: 'https://acmeplumbing.example.com/' },
  });
  mockNormalizeFirecrawlResponse.mockReturnValue(VALID_SNAPSHOT);
  mockIngestScanImages.mockResolvedValue([]);
  // Mirrors what the real generatePreviewContent does — threads the caller's
  // enrichment.scanId into the returned metadata — so provenance assertions
  // exercise the actual pipeline wiring rather than a static fixture.
  mockGeneratePreviewContent.mockImplementation(async (_business: Business, options?: { enrichment?: { scanId: string } }) => ({
    ...VALID_GENERATED,
    metadata: { ...VALID_GENERATED.metadata, scanId: options?.enrichment?.scanId },
  }));
});

describe('enrichBusinessWebsite — first preview / next version', () => {
  it('creates preview version 1 when no preview exists yet', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListPreviewsForBusiness.mockResolvedValue([]);

    const outcome = await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('completed');
    const savedPreview = mockPutSitePreview.mock.calls[0][0] as SitePreview;
    expect(savedPreview.version).toBe(1);
  });

  it('creates the next version when a preview already exists', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListPreviewsForBusiness.mockResolvedValue([{ version: 1 } as SitePreview, { version: 2 } as SitePreview]);

    await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    const savedPreview = mockPutSitePreview.mock.calls[0][0] as SitePreview;
    expect(savedPreview.version).toBe(3);
  });

  it('never overwrites a prior preview — putSitePreview is called with a brand-new previewId', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListPreviewsForBusiness.mockResolvedValue([{ version: 1, previewId: 'preview_old' } as SitePreview]);

    await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    const savedPreview = mockPutSitePreview.mock.calls[0][0] as SitePreview;
    expect(savedPreview.previewId).not.toBe('preview_old');
  });
});

describe('enrichBusinessWebsite — provenance', () => {
  it('records generation source and scanId on the resulting SitePreview', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());

    const outcome = await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    const savedPreview = mockPutSitePreview.mock.calls[0][0] as SitePreview;
    expect(savedPreview.generationMetadata?.source).toBe('firecrawl_enriched');
    expect(savedPreview.generationMetadata?.scanId).toBe(outcome.scanId);
  });

  it('marks the ScanEvent completed with generatedPreviewId set', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());

    await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    const finalScanWrite = mockPutScanEvent.mock.calls.at(-1)?.[0] as ScanEvent;
    expect(finalScanWrite.status).toBe('completed');
    expect(finalScanWrite.generatedPreviewId).toBeTruthy();
  });
});

describe('enrichBusinessWebsite — Business is canonical', () => {
  it('never writes Firecrawl content onto Business — only enrichment-disposition fields', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());

    await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    const allowedKeys = new Set(['enrichmentStatus', 'manualApprovalReason', 'manualApprovalNote']);
    for (const call of mockUpdateBusiness.mock.calls) {
      const updates = call[1] as Record<string, unknown>;
      for (const key of Object.keys(updates)) {
        expect(allowedKeys.has(key)).toBe(true);
      }
    }
  });

  it('passes the merged generation context to generatePreviewContent without mutating the Business record', async () => {
    const business = makeBusiness();
    mockGetBusinessById.mockResolvedValue(business);

    await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(mockGeneratePreviewContent).toHaveBeenCalledWith(
      business,
      expect.objectContaining({ enrichment: expect.objectContaining({ snapshot: VALID_SNAPSHOT }) }),
    );
  });
});

describe('enrichBusinessWebsite — missing website', () => {
  it('sets manual_approval_required with the exact required note and never calls Firecrawl', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness({ websiteUrl: undefined }));

    const outcome = await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('manual_approval_required');
    expect(outcome.message).toBe(
      'No website was available for Firecrawl enrichment. No images were downloaded. Manual image sourcing and approval are required.',
    );
    expect(mockScrapeWebsite).not.toHaveBeenCalled();
    expect(mockIngestScanImages).not.toHaveBeenCalled();

    expect(mockUpdateBusiness).toHaveBeenCalledWith(
      'biz_00000000-0000-0000-0000-000000000001',
      expect.objectContaining({
        enrichmentStatus: 'manual_approval_required',
        manualApprovalReason: 'missing_website',
        manualApprovalNote:
          'No website was available for Firecrawl enrichment. No images were downloaded. Manual image sourcing and approval are required.',
      }),
    );
  });

  it('does not create a generic failed ScanEvent for the no-website case', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness({ websiteUrl: '' }));

    await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    const finalScanWrite = mockPutScanEvent.mock.calls.at(-1)?.[0] as ScanEvent;
    expect(finalScanWrite.status).toBe('manual_approval_required');
    expect(finalScanWrite.failureCategory).toBe('missing_website');
  });
});

describe('enrichBusinessWebsite — no usable images', () => {
  it('still generates using the image-free fallback and flags no_usable_images', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockIngestScanImages.mockResolvedValue([]);

    const outcome = await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('completed');
    expect(mockUpdateBusiness).toHaveBeenCalledWith(
      'biz_00000000-0000-0000-0000-000000000001',
      expect.objectContaining({
        enrichmentStatus: 'enrichment_completed',
        manualApprovalReason: 'no_usable_images',
      }),
    );
  });
});

describe('enrichBusinessWebsite — URL validation', () => {
  it('rejects a private/blocked URL before ever calling Firecrawl', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness({ websiteUrl: 'http://169.254.169.254/' }));
    mockValidateOutboundUrl.mockResolvedValue({ ok: false, reason: 'private_or_blocked_address' });

    const outcome = await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('failed');
    expect(mockScrapeWebsite).not.toHaveBeenCalled();
    const finalScanWrite = mockPutScanEvent.mock.calls.at(-1)?.[0] as ScanEvent;
    expect(finalScanWrite.failureCategory).toBe('blocked_url');
  });

  it('rejects a malformed URL as invalid_url', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness({ websiteUrl: 'not a url' }));
    mockValidateOutboundUrl.mockResolvedValue({ ok: false, reason: 'invalid_hostname' });

    const outcome = await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('failed');
    const finalScanWrite = mockPutScanEvent.mock.calls.at(-1)?.[0] as ScanEvent;
    expect(finalScanWrite.failureCategory).toBe('invalid_url');
  });
});

describe('enrichBusinessWebsite — artifact storage', () => {
  it('stores raw and extracted artifacts under the correct scan path', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());

    const outcome = await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    const putAssetKeys = mockPutAsset.mock.calls.map((c) => c[0] as string);
    expect(putAssetKeys).toContain(`scans/biz_00000000-0000-0000-0000-000000000001/${outcome.scanId}/crawl.json`);
    expect(putAssetKeys).toContain(`scans/biz_00000000-0000-0000-0000-000000000001/${outcome.scanId}/extracted.json`);
  });
});

describe('enrichBusinessWebsite — normalization failure', () => {
  it('classifies a normalization error as normalization_failed', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockNormalizeFirecrawlResponse.mockImplementation(() => {
      throw new Error('invalid snapshot shape');
    });

    const outcome = await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('failed');
    const finalScanWrite = mockPutScanEvent.mock.calls.at(-1)?.[0] as ScanEvent;
    expect(finalScanWrite.failureCategory).toBe('normalization_failed');
  });
});

describe('enrichBusinessWebsite — Firecrawl failure classification and retry', () => {
  it('honors a 429 with automatic inline retry and succeeds on the second attempt', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockScrapeWebsite
      .mockRejectedValueOnce(new FirecrawlApiError('rate_limit', 'rate limited', { retryAfterSeconds: 0 }))
      .mockResolvedValueOnce({ markdown: 'ok', metadata: { statusCode: 200 } });

    const outcome = await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('completed');
    expect(mockScrapeWebsite).toHaveBeenCalledTimes(2);
  });

  it('bounds retry for a persistent 5xx and eventually fails as firecrawl_provider_error', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockScrapeWebsite.mockRejectedValue(new FirecrawlApiError('provider_error', 'server error'));

    const outcome = await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('failed');
    const finalScanWrite = mockPutScanEvent.mock.calls.at(-1)?.[0] as ScanEvent;
    expect(finalScanWrite.failureCategory).toBe('firecrawl_provider_error');
    // Bounded: not called an unbounded number of times.
    expect(mockScrapeWebsite.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('does not retry an auth failure', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockScrapeWebsite.mockRejectedValue(new FirecrawlApiError('auth', 'invalid key'));

    const outcome = await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('failed');
    expect(mockScrapeWebsite).toHaveBeenCalledTimes(1);
    const finalScanWrite = mockPutScanEvent.mock.calls.at(-1)?.[0] as ScanEvent;
    expect(finalScanWrite.failureCategory).toBe('firecrawl_auth');
  });
});

describe('enrichBusinessWebsite — concurrency', () => {
  it('rejects a new scan when one is already queued or running', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListScansForBusiness.mockResolvedValue([{ status: 'running' } as ScanEvent]);

    const outcome = await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('conflict');
    expect(mockScrapeWebsite).not.toHaveBeenCalled();
    expect(mockPutScanEvent).not.toHaveBeenCalled();
  });
});

describe('retryEnrichmentScan', () => {
  it('creates a new ScanEvent linked by retryOfScanId with an incremented attempt, never re-running the old one', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockGetScanEventById.mockResolvedValue({
      scanId: 'scan_11111111-1111-1111-1111-111111111111',
      businessId: 'biz_00000000-0000-0000-0000-000000000001',
      status: 'failed',
      failureCategory: 'firecrawl_timeout',
      sourceUrl: 'https://acmeplumbing.example.com/',
      attempt: 1,
      provider: 'firecrawl',
      operation: 'scrape',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ScanEvent);

    const outcome = await retryEnrichmentScan('biz_00000000-0000-0000-0000-000000000001', 'scan_11111111-1111-1111-1111-111111111111');

    expect(outcome.status).toBe('completed');
    expect(outcome.scanId).not.toBe('scan_11111111-1111-1111-1111-111111111111');

    // The prior failed ScanEvent is never written back to 'running' or 'completed'.
    const writesToPriorScan = mockPutScanEvent.mock.calls.filter((c) => (c[0] as ScanEvent).scanId === 'scan_11111111-1111-1111-1111-111111111111');
    expect(writesToPriorScan).toHaveLength(0);

    const newScanWrites = mockPutScanEvent.mock.calls.filter((c) => (c[0] as ScanEvent).scanId === outcome.scanId);
    expect(newScanWrites[0][0]).toMatchObject({ retryOfScanId: 'scan_11111111-1111-1111-1111-111111111111', attempt: 2 });
  });

  it('refuses to retry a non-retryable failure category', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockGetScanEventById.mockResolvedValue({
      scanId: 'scan_11111111-1111-1111-1111-111111111111',
      businessId: 'biz_00000000-0000-0000-0000-000000000001',
      status: 'failed',
      failureCategory: 'invalid_url',
      sourceUrl: 'https://acmeplumbing.example.com/',
      attempt: 1,
      provider: 'firecrawl',
      operation: 'scrape',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ScanEvent);

    const outcome = await retryEnrichmentScan('biz_00000000-0000-0000-0000-000000000001', 'scan_11111111-1111-1111-1111-111111111111');

    expect(outcome.status).toBe('not_eligible_for_retry');
    expect(mockScrapeWebsite).not.toHaveBeenCalled();
  });
});

describe('enrichBusinessWebsite — no secret or raw content leakage', () => {
  it('the returned outcome never contains raw page content or the API key', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockScrapeWebsite.mockResolvedValue({
      markdown: 'SECRET_PAGE_MARKDOWN_CONTENT fc-should-never-appear-here',
      metadata: { statusCode: 200 },
    });

    const outcome = await enrichBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    const serialized = JSON.stringify(outcome);
    expect(serialized).not.toContain('SECRET_PAGE_MARKDOWN_CONTENT');
    expect(serialized).not.toContain('fc-should-never-appear-here');
  });
});
