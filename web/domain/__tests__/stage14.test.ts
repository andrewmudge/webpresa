/**
 * Domain-layer tests for Stage 14 (Playwright Screenshots) additions to the
 * shared ScanEvent shape: the 'playwright' provider/'screenshot' operation,
 * the 'partial' status, the six Playwright-specific failure categories, and
 * the targetType/previewId/captureResults fields.
 */
import { describe, it, expect } from 'vitest';
import { createBusiness } from '@/domain/factories/business.factory';
import { createScanEvent } from '@/domain/factories/scan-event.factory';
import { ScanEventSchema } from '@/domain/schemas/scan-event.schema';

describe('ScanEvent (Stage 14 shape)', () => {
  it('creates an existing_site screenshot ScanEvent with no previewId', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const scan = createScanEvent({
      businessId: biz.businessId,
      provider: 'playwright',
      operation: 'screenshot',
      targetType: 'existing_site',
      sourceUrl: 'https://acme.com',
    });
    expect(scan.status).toBe('queued');
    expect(scan.targetType).toBe('existing_site');
    expect(scan.previewId).toBeUndefined();
    expect(() => ScanEventSchema.parse(scan)).not.toThrow();
  });

  it('creates a generated_preview screenshot ScanEvent with a previewId', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const scan = createScanEvent({
      businessId: biz.businessId,
      provider: 'playwright',
      operation: 'screenshot',
      targetType: 'generated_preview',
      previewId: 'preview_00000000-0000-0000-0000-000000000001',
    });
    expect(scan.targetType).toBe('generated_preview');
    expect(scan.previewId).toBe('preview_00000000-0000-0000-0000-000000000001');
    expect(() => ScanEventSchema.parse(scan)).not.toThrow();
  });

  it('accepts a partial result with per-viewport captureResults', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const scan = createScanEvent({
      businessId: biz.businessId,
      provider: 'playwright',
      operation: 'screenshot',
      targetType: 'existing_site',
      sourceUrl: 'https://acme.com',
    });
    const partial = {
      ...scan,
      status: 'partial' as const,
      captureResults: {
        desktop: {
          status: 'completed' as const,
          storageKey: `scans/${biz.businessId}/${scan.scanId}/existing/desktop.png`,
        },
        mobile: {
          status: 'failed' as const,
          failureCategory: 'navigation_timeout' as const,
          failureMessage: 'Navigation timed out after 30s.',
        },
      },
    };
    expect(() => ScanEventSchema.parse(partial)).not.toThrow();
  });

  it('accepts every new Stage 14 failure category', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const scan = createScanEvent({
      businessId: biz.businessId,
      provider: 'playwright',
      operation: 'screenshot',
      targetType: 'existing_site',
      sourceUrl: 'https://acme.com',
    });
    const categories = [
      'browser_launch_failed',
      'navigation_timeout',
      'page_load_failed',
      'blocked_by_bot_protection',
      'screenshot_failed',
      'upload_failed',
    ] as const;
    for (const failureCategory of categories) {
      const failed = { ...scan, status: 'failed' as const, failureCategory };
      expect(() => ScanEventSchema.parse(failed)).not.toThrow();
    }
  });

  it('rejects an invalid targetType', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const scan = createScanEvent({
      businessId: biz.businessId,
      provider: 'playwright',
      operation: 'screenshot',
      targetType: 'existing_site',
      sourceUrl: 'https://acme.com',
    });
    const result = ScanEventSchema.safeParse({ ...scan, targetType: 'competitor_site' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid status (partial did not exist before this stage)', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const scan = createScanEvent({
      businessId: biz.businessId,
      provider: 'playwright',
      operation: 'screenshot',
      targetType: 'existing_site',
      sourceUrl: 'https://acme.com',
    });
    const result = ScanEventSchema.safeParse({ ...scan, status: 'half_done' });
    expect(result.success).toBe(false);
  });

  it('a Firecrawl ScanEvent remains valid with no Stage 14 fields set (backward compatible)', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const scan = createScanEvent({ businessId: biz.businessId, provider: 'firecrawl', operation: 'scrape' });
    expect(scan.targetType).toBeUndefined();
    expect(scan.previewId).toBeUndefined();
    expect(scan.captureResults).toBeUndefined();
    expect(() => ScanEventSchema.parse(scan)).not.toThrow();
  });
});
