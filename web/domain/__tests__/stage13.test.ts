/**
 * Domain-layer tests for Stage 13 (Firecrawl Website Enrichment) additions:
 * the redesigned ScanEvent shape, Business enrichment-disposition fields,
 * and the WebsiteEnrichmentSnapshot schema.
 */
import { describe, it, expect } from 'vitest';
import { createBusiness } from '@/domain/factories/business.factory';
import { createScanEvent } from '@/domain/factories/scan-event.factory';
import { ScanEventSchema } from '@/domain/schemas/scan-event.schema';
import { BusinessSchema } from '@/domain/schemas/business.schema';
import { WebsiteEnrichmentSnapshotSchema } from '@/domain/schemas/website-enrichment.schema';

describe('ScanEvent (Stage 13 shape)', () => {
  it('a freshly created ScanEvent starts queued with attempt 1 and no sourceUrl required', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const scan = createScanEvent({ businessId: biz.businessId, provider: 'firecrawl', operation: 'scrape' });
    expect(scan.status).toBe('queued');
    expect(scan.attempt).toBe(1);
    expect(scan.sourceUrl).toBeUndefined();
  });

  it('accepts every new Stage 13 field', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const scan = createScanEvent({ businessId: biz.businessId, provider: 'firecrawl', operation: 'scrape', sourceUrl: 'https://acme.com' });
    const withStage13Fields = {
      ...scan,
      status: 'completed' as const,
      finalUrl: 'https://acme.com/',
      httpStatus: 200,
      rawArtifactKey: `scans/${biz.businessId}/${scan.scanId}/crawl.json`,
      extractedArtifactKey: `scans/${biz.businessId}/${scan.scanId}/extracted.json`,
      generatedPreviewId: 'preview_00000000-0000-0000-0000-000000000001',
      images: [
        {
          imageId: 'img1',
          role: 'hero' as const,
          status: 'accepted' as const,
          originalUrl: 'https://acme.com/hero.jpg',
          url: '/api/assets/scans/x/y/images/img1.jpg',
        },
      ],
    };
    expect(() => ScanEventSchema.parse(withStage13Fields)).not.toThrow();
  });

  it('rejects an invalid failureCategory', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const scan = createScanEvent({ businessId: biz.businessId, provider: 'firecrawl', operation: 'scrape' });
    const result = ScanEventSchema.safeParse({ ...scan, status: 'failed', failureCategory: 'server_on_fire' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid provider', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const scan = createScanEvent({ businessId: biz.businessId, provider: 'firecrawl', operation: 'scrape' });
    const result = ScanEventSchema.safeParse({ ...scan, provider: 'playwright' });
    expect(result.success).toBe(false);
  });

  it('a retry carries retryOfScanId and an incremented attempt', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const first = createScanEvent({ businessId: biz.businessId, provider: 'firecrawl', operation: 'scrape', sourceUrl: 'https://acme.com' });
    const retry = createScanEvent({
      businessId: biz.businessId,
      provider: 'firecrawl',
      operation: 'scrape',
      sourceUrl: 'https://acme.com',
      attempt: first.attempt + 1,
      retryOfScanId: first.scanId,
    });
    expect(retry.attempt).toBe(2);
    expect(retry.retryOfScanId).toBe(first.scanId);
    expect(retry.scanId).not.toBe(first.scanId);
  });
});

describe('Business (Stage 13 enrichment fields)', () => {
  it('accepts the no-website manual-approval disposition', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing', source: 'google_places' });
    const withDisposition = {
      ...biz,
      enrichmentStatus: 'manual_approval_required' as const,
      manualApprovalReason: 'missing_website' as const,
      manualApprovalNote:
        'No website was available for Firecrawl enrichment. No images were downloaded. Manual image sourcing and approval are required.',
    };
    expect(() => BusinessSchema.parse(withDisposition)).not.toThrow();
  });

  it('a Business without any Stage 13 fields remains valid (no backfill required)', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    expect(() => BusinessSchema.parse(biz)).not.toThrow();
  });

  it('rejects an invalid enrichmentStatus', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const result = BusinessSchema.safeParse({ ...biz, enrichmentStatus: 'in_the_cloud' });
    expect(result.success).toBe(false);
  });
});

describe('WebsiteEnrichmentSnapshotSchema', () => {
  const validSnapshot = {
    schemaVersion: '1' as const,
    sourceUrl: 'https://acme.com/',
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
  };

  it('accepts a minimal valid snapshot', () => {
    expect(() => WebsiteEnrichmentSnapshotSchema.parse(validSnapshot)).not.toThrow();
  });

  it('rejects a malformed sourceUrl', () => {
    const result = WebsiteEnrichmentSnapshotSchema.safeParse({ ...validSnapshot, sourceUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects a services array longer than the cap', () => {
    const tooMany = Array.from({ length: 25 }, (_, i) => ({ name: `Service ${i}` }));
    const result = WebsiteEnrichmentSnapshotSchema.safeParse({ ...validSnapshot, services: tooMany });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed URL inside links', () => {
    const result = WebsiteEnrichmentSnapshotSchema.safeParse({ ...validSnapshot, links: [{ url: 'not-a-url' }] });
    expect(result.success).toBe(false);
  });

  it('rejects an unsupported schemaVersion', () => {
    const result = WebsiteEnrichmentSnapshotSchema.safeParse({ ...validSnapshot, schemaVersion: '2' });
    expect(result.success).toBe(false);
  });
});
