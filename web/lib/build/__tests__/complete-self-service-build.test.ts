/**
 * Unit tests for getSelfServiceBuildStatus — the polled progress/completion
 * check. The key behavior under test: a terminal ScanExecution with a
 * previewId is treated as a successful build regardless of which terminal
 * status string it carries (`preview_ready`, `reject`, or `manual_review`
 * all mean "done" from a self-service point of view — see the module's own
 * doc comment for why).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetScanExecutionById, mockGetBusinessById, mockUpdateBusiness, mockGetSitePreviewById, mockPublishSitePreview } = vi.hoisted(() => ({
  mockGetScanExecutionById: vi.fn(),
  mockGetBusinessById: vi.fn(),
  mockUpdateBusiness: vi.fn(),
  mockGetSitePreviewById: vi.fn(),
  mockPublishSitePreview: vi.fn(),
}));

vi.mock('@/lib/db/scan-executions', () => ({ getScanExecutionById: mockGetScanExecutionById }));
vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById, updateBusiness: mockUpdateBusiness }));
vi.mock('@/lib/db/site-previews', () => ({
  getSitePreviewById: mockGetSitePreviewById,
  publishSitePreview: mockPublishSitePreview,
}));
vi.mock('server-only', () => ({}));

import { getSelfServiceBuildStatus } from '../complete-self-service-build';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getSelfServiceBuildStatus', () => {
  it('reports not_found for an unknown buildId', async () => {
    mockGetScanExecutionById.mockResolvedValueOnce(null);
    const result = await getSelfServiceBuildStatus('scanexec_missing');
    expect(result).toEqual({ outcome: 'not_found' });
  });

  it('reports in_progress with the current step and hasExistingWebsite while queued/running', async () => {
    mockGetScanExecutionById.mockResolvedValueOnce({
      scanExecutionId: 'scanexec_1',
      businessId: 'biz_1',
      status: 'running',
      currentStep: 'crawling',
    });
    mockGetBusinessById.mockResolvedValueOnce({ businessId: 'biz_1', websiteUrl: 'https://acme-plumbing.com' });

    const result = await getSelfServiceBuildStatus('scanexec_1');

    expect(result).toEqual({ outcome: 'in_progress', status: 'running', currentStep: 'crawling', hasExistingWebsite: true });
    expect(mockGetSitePreviewById).not.toHaveBeenCalled();
  });

  it('reports hasExistingWebsite: false on the no-website branch', async () => {
    mockGetScanExecutionById.mockResolvedValueOnce({
      scanExecutionId: 'scanexec_1',
      businessId: 'biz_1',
      status: 'running',
      currentStep: 'recording_no_website',
    });
    mockGetBusinessById.mockResolvedValueOnce({ businessId: 'biz_1' });

    const result = await getSelfServiceBuildStatus('scanexec_1');

    expect(result).toEqual({
      outcome: 'in_progress',
      status: 'running',
      currentStep: 'recording_no_website',
      hasExistingWebsite: false,
    });
  });

  it('publishes and reports ready on the qualified/preview_ready outcome', async () => {
    mockGetScanExecutionById.mockResolvedValueOnce({
      scanExecutionId: 'scanexec_1',
      businessId: 'biz_1',
      status: 'preview_ready',
      previewId: 'preview_1',
    });
    mockGetSitePreviewById.mockResolvedValueOnce({ previewId: 'preview_1', status: 'draft' });
    mockPublishSitePreview.mockResolvedValueOnce({ previewId: 'preview_1', status: 'published' });
    mockGetBusinessById.mockResolvedValueOnce({ businessId: 'biz_1', slug: 'acme-plumbing' });

    const result = await getSelfServiceBuildStatus('scanexec_1');

    expect(mockPublishSitePreview).toHaveBeenCalledWith('preview_1');
    expect(mockUpdateBusiness).toHaveBeenCalledWith('biz_1', { currentPreviewId: 'preview_1' });
    expect(result).toEqual({ outcome: 'ready', slug: 'acme-plumbing', previewId: 'preview_1' });
  });

  it('treats a "reject" outcome with a previewId as ready too — lead qualification is irrelevant to self-service', async () => {
    mockGetScanExecutionById.mockResolvedValueOnce({
      scanExecutionId: 'scanexec_1',
      businessId: 'biz_1',
      status: 'reject',
      previewId: 'preview_1',
    });
    mockGetSitePreviewById.mockResolvedValueOnce({ previewId: 'preview_1', status: 'draft' });
    mockPublishSitePreview.mockResolvedValueOnce({ previewId: 'preview_1', status: 'published' });
    mockGetBusinessById.mockResolvedValueOnce({ businessId: 'biz_1', slug: 'acme-plumbing' });

    const result = await getSelfServiceBuildStatus('scanexec_1');

    expect(result.outcome).toBe('ready');
  });

  it('does not re-publish an already-published preview', async () => {
    mockGetScanExecutionById.mockResolvedValueOnce({
      scanExecutionId: 'scanexec_1',
      businessId: 'biz_1',
      status: 'manual_review',
      previewId: 'preview_1',
    });
    mockGetSitePreviewById.mockResolvedValueOnce({ previewId: 'preview_1', status: 'published' });
    mockGetBusinessById.mockResolvedValueOnce({ businessId: 'biz_1', slug: 'acme-plumbing' });

    const result = await getSelfServiceBuildStatus('scanexec_1');

    expect(mockPublishSitePreview).not.toHaveBeenCalled();
    expect(mockUpdateBusiness).not.toHaveBeenCalled();
    expect(result.outcome).toBe('ready');
  });

  it('reports failed for a terminal outcome with no previewId (e.g. unreachable URL)', async () => {
    mockGetScanExecutionById.mockResolvedValueOnce({
      scanExecutionId: 'scanexec_1',
      businessId: 'biz_1',
      status: 'manual_review',
    });

    const result = await getSelfServiceBuildStatus('scanexec_1');

    expect(result.outcome).toBe('failed');
    expect(mockGetSitePreviewById).not.toHaveBeenCalled();
  });

  it('reports failed when the workflow itself failed outright', async () => {
    mockGetScanExecutionById.mockResolvedValueOnce({
      scanExecutionId: 'scanexec_1',
      businessId: 'biz_1',
      status: 'failed',
    });

    const result = await getSelfServiceBuildStatus('scanexec_1');

    expect(result.outcome).toBe('failed');
  });
});
