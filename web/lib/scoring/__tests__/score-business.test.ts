/**
 * Unit tests for the Stage 15 scoring orchestration. Every external
 * dependency (DynamoDB repositories, S3, AI scoring) is mocked — no real
 * network, AWS, or provider calls. Mirrors
 * lib/firecrawl/__tests__/enrich-business.test.ts's mocking shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import type { Business } from '@/domain/models/business';
import type { ScanEvent } from '@/domain/models/scan-event';
import type { WebsiteAssessment } from '@/domain/models/website-assessment';

const {
  mockGetBusinessById,
  mockUpdateBusiness,
  mockListScansForBusiness,
  mockPutScanEvent,
  mockGetAsset,
  mockPutAsset,
  mockGetSignedAssetUrl,
  mockScoreWebsite,
} = vi.hoisted(() => ({
  mockGetBusinessById: vi.fn(),
  mockUpdateBusiness: vi.fn(),
  mockListScansForBusiness: vi.fn(),
  mockPutScanEvent: vi.fn(),
  mockGetAsset: vi.fn(),
  mockPutAsset: vi.fn(),
  mockGetSignedAssetUrl: vi.fn(),
  mockScoreWebsite: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById, updateBusiness: mockUpdateBusiness }));
vi.mock('@/lib/db/scan-events', () => ({ listScansForBusiness: mockListScansForBusiness, putScanEvent: mockPutScanEvent }));
vi.mock('@/lib/s3/assets', () => ({ getAsset: mockGetAsset, putAsset: mockPutAsset, getSignedAssetUrl: mockGetSignedAssetUrl }));
vi.mock('@/lib/ai/score-website', () => ({ scoreWebsite: mockScoreWebsite }));

import { scoreBusinessWebsite } from '../score-business';

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

function makeFirecrawlScan(overrides: Partial<ScanEvent> = {}): ScanEvent {
  return {
    scanId: 'scan_11111111-1111-1111-1111-111111111111',
    businessId: 'biz_00000000-0000-0000-0000-000000000001',
    provider: 'firecrawl',
    operation: 'scrape',
    status: 'completed',
    attempt: 1,
    extractedArtifactKey: 'scans/biz_00000000-0000-0000-0000-000000000001/scan_11111111-1111-1111-1111-111111111111/extracted.json',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const VALID_SNAPSHOT = {
  schemaVersion: '1',
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

const VALID_ASSESSMENT: WebsiteAssessment = {
  schemaVersion: '1',
  overallScore: 62,
  confidence: 'medium',
  leadPriority: 'medium',
  qualification: 'qualified',
  categories: {} as WebsiteAssessment['categories'],
  strengths: ['Clear services'],
  weaknesses: ['No trust signals'],
  missingOpportunities: ['Testimonials'],
  executiveSummary: 'Serviceable but dated.',
  topProblems: ['No testimonials'],
  generatedAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockListScansForBusiness.mockResolvedValue([]);
  mockUpdateBusiness.mockResolvedValue(undefined);
  mockPutScanEvent.mockResolvedValue(undefined);
  mockPutAsset.mockResolvedValue(undefined);
  mockGetAsset.mockResolvedValue(Buffer.from(JSON.stringify(VALID_SNAPSHOT)));
  mockGetSignedAssetUrl.mockResolvedValue('https://signed.example.com/x.png');
  mockScoreWebsite.mockResolvedValue({
    assessment: VALID_ASSESSMENT,
    raw: VALID_ASSESSMENT,
    metadata: { model: 'gpt-5.5', promptVersion: '2026-07-24', durationMs: 500 },
  });
});

describe('scoreBusinessWebsite — no website', () => {
  it('auto-qualifies without ever calling the AI', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness({ websiteUrl: undefined }));

    const outcome = await scoreBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('completed');
    expect(mockScoreWebsite).not.toHaveBeenCalled();
    expect(mockUpdateBusiness).toHaveBeenCalledWith('biz_00000000-0000-0000-0000-000000000001', { qualification: 'qualified' });
  });
});

describe('scoreBusinessWebsite — Firecrawl eligibility gate', () => {
  it('is not eligible when no Firecrawl scan exists yet', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListScansForBusiness.mockResolvedValue([]);

    const outcome = await scoreBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('not_eligible');
    expect(mockScoreWebsite).not.toHaveBeenCalled();
  });

  it('is not eligible while a Firecrawl scan is still running', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListScansForBusiness.mockResolvedValue([makeFirecrawlScan({ status: 'running' })]);

    const outcome = await scoreBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('not_eligible');
  });

  it('flags manual review (no AI call) when Firecrawl failed with website_unreachable', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListScansForBusiness.mockResolvedValue([makeFirecrawlScan({ status: 'failed', failureCategory: 'website_unreachable' })]);

    const outcome = await scoreBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('manual_approval_required');
    expect(mockScoreWebsite).not.toHaveBeenCalled();
    expect(mockUpdateBusiness).toHaveBeenCalledWith('biz_00000000-0000-0000-0000-000000000001', { qualification: 'manual_review' });
  });

  it('flags manual review (no AI call) when the target site returned an error response (e.g. a 403 block page)', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListScansForBusiness.mockResolvedValue([makeFirecrawlScan({ status: 'failed', failureCategory: 'website_error_response' })]);

    const outcome = await scoreBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('manual_approval_required');
    expect(mockScoreWebsite).not.toHaveBeenCalled();
    expect(mockUpdateBusiness).toHaveBeenCalledWith('biz_00000000-0000-0000-0000-000000000001', { qualification: 'manual_review' });
  });

  it('is not eligible (not auto-manual-reviewed) for an unrelated Firecrawl failure', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListScansForBusiness.mockResolvedValue([makeFirecrawlScan({ status: 'failed', failureCategory: 'empty_content' })]);

    const outcome = await scoreBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('not_eligible');
    expect(mockUpdateBusiness).not.toHaveBeenCalled();
  });
});

describe('scoreBusinessWebsite — concurrency', () => {
  it('rejects a new scoring attempt when one is already queued or running', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListScansForBusiness.mockResolvedValue([
      { provider: 'openai', operation: 'score', status: 'running' } as ScanEvent,
    ]);

    const outcome = await scoreBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('conflict');
    expect(mockScoreWebsite).not.toHaveBeenCalled();
  });

  it('does not treat an active Firecrawl scan as a scoring conflict', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListScansForBusiness.mockResolvedValue([makeFirecrawlScan({ status: 'running' })]);

    const outcome = await scoreBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    // Not a conflict — it's the Firecrawl-not-yet-complete "not_eligible" path.
    expect(outcome.status).toBe('not_eligible');
  });
});

describe('scoreBusinessWebsite — success', () => {
  it('persists the assessment on the ScanEvent and the qualification disposition on Business', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListScansForBusiness.mockResolvedValue([makeFirecrawlScan()]);

    const outcome = await scoreBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('completed');
    const finalScanWrite = mockPutScanEvent.mock.calls.at(-1)?.[0] as ScanEvent;
    expect(finalScanWrite.status).toBe('completed');
    expect(finalScanWrite.assessment).toEqual(VALID_ASSESSMENT);
    expect(finalScanWrite.aiResponseArtifactKey).toContain('/ai-response.json');

    expect(mockUpdateBusiness).toHaveBeenCalledWith('biz_00000000-0000-0000-0000-000000000001', {
      qualification: 'qualified',
      leadPriority: 'medium',
      websiteQualityScore: 62,
    });
  });

  it('passes the parsed snapshot from the Firecrawl extractedArtifactKey to scoreWebsite', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListScansForBusiness.mockResolvedValue([makeFirecrawlScan()]);

    await scoreBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(mockScoreWebsite).toHaveBeenCalledWith(
      expect.objectContaining({ snapshot: expect.objectContaining({ sourceUrl: 'https://acmeplumbing.example.com' }) }),
    );
  });

  it('fetches signed screenshot URLs only for viewports that completed', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    const screenshotScan: ScanEvent = {
      scanId: 'scan_22222222-2222-2222-2222-222222222222',
      businessId: 'biz_00000000-0000-0000-0000-000000000001',
      provider: 'playwright',
      operation: 'screenshot',
      targetType: 'existing_site',
      status: 'partial',
      attempt: 1,
      captureResults: {
        desktop: { status: 'completed', storageKey: 'scans/biz/scan/existing/desktop.png' },
        mobile: { status: 'failed', failureCategory: 'screenshot_failed' },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockListScansForBusiness.mockResolvedValue([makeFirecrawlScan(), screenshotScan]);

    await scoreBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(mockGetSignedAssetUrl).toHaveBeenCalledTimes(1);
    expect(mockGetSignedAssetUrl).toHaveBeenCalledWith('scans/biz/scan/existing/desktop.png', 600);
  });

  it('applies the qualification override on top of the AI recommendation', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListScansForBusiness.mockResolvedValue([makeFirecrawlScan()]);
    mockScoreWebsite.mockResolvedValue({
      assessment: { ...VALID_ASSESSMENT, qualification: 'reject' },
      raw: {},
      metadata: { model: 'gpt-5.5', promptVersion: '2026-07-24', durationMs: 500 },
    });

    await scoreBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    // Business has a website and Firecrawl succeeded — no override applies, AI's 'reject' passes through.
    expect(mockUpdateBusiness).toHaveBeenCalledWith(
      'biz_00000000-0000-0000-0000-000000000001',
      expect.objectContaining({ qualification: 'reject' }),
    );
  });
});

describe('scoreBusinessWebsite — AI failure classification', () => {
  it('classifies a ZodError as invalid_ai_schema_output', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListScansForBusiness.mockResolvedValue([makeFirecrawlScan()]);
    mockScoreWebsite.mockRejectedValue(new z.ZodError([]));

    const outcome = await scoreBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('failed');
    const finalScanWrite = mockPutScanEvent.mock.calls.at(-1)?.[0] as ScanEvent;
    expect(finalScanWrite.failureCategory).toBe('invalid_ai_schema_output');
  });

  it('classifies a generic OpenAI error as ai_request_failed', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListScansForBusiness.mockResolvedValue([makeFirecrawlScan()]);
    mockScoreWebsite.mockRejectedValue(new Error('502 Bad Gateway'));

    const outcome = await scoreBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('failed');
    const finalScanWrite = mockPutScanEvent.mock.calls.at(-1)?.[0] as ScanEvent;
    expect(finalScanWrite.failureCategory).toBe('ai_request_failed');
  });

  it('classifies a timeout error as ai_timeout', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListScansForBusiness.mockResolvedValue([makeFirecrawlScan()]);
    mockScoreWebsite.mockRejectedValue(new Error('Request timeout after 60000ms'));

    const outcome = await scoreBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('failed');
    const finalScanWrite = mockPutScanEvent.mock.calls.at(-1)?.[0] as ScanEvent;
    expect(finalScanWrite.failureCategory).toBe('ai_timeout');
  });

  it('classifies an artifact storage failure separately from an AI failure', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListScansForBusiness.mockResolvedValue([makeFirecrawlScan()]);
    mockPutAsset.mockRejectedValue(new Error('S3 unavailable'));

    const outcome = await scoreBusinessWebsite('biz_00000000-0000-0000-0000-000000000001');

    expect(outcome.status).toBe('failed');
    const finalScanWrite = mockPutScanEvent.mock.calls.at(-1)?.[0] as ScanEvent;
    expect(finalScanWrite.failureCategory).toBe('artifact_storage_failed');
  });
});
