/**
 * Unit tests for Stage 14 screenshot-capture orchestration. DynamoDB
 * repositories and the Lambda client are mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetBusinessById = vi.hoisted(() => vi.fn());
const mockListPreviewsForBusiness = vi.hoisted(() => vi.fn());
const mockListScansForBusiness = vi.hoisted(() => vi.fn());
const mockPutScanEvent = vi.hoisted(() => vi.fn());
const mockSend = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById }));
vi.mock('@/lib/db/site-previews', () => ({ listPreviewsForBusiness: mockListPreviewsForBusiness }));
vi.mock('@/lib/db/scan-events', () => ({
  listScansForBusiness: mockListScansForBusiness,
  putScanEvent: mockPutScanEvent,
}));
vi.mock('@/lib/lambda/client', () => ({
  getLambdaClient: () => ({ send: mockSend }),
  getScreenshotLambdaFunctionName: () => 'webpresa-dev-screenshot-capture',
}));
vi.mock('server-only', () => ({}));

import {
  captureExistingSiteScreenshot,
  captureGeneratedPreviewScreenshot,
  markStaleScanFailed,
  isStaleScan,
  STALE_SCAN_THRESHOLD_MS,
} from '../capture';
import type { ScanEvent } from '@/domain/models/scan-event';

const BUSINESS_ID = 'biz_00000000-0000-0000-0000-000000000001';

function makeScan(overrides: Partial<ScanEvent> = {}): ScanEvent {
  return {
    scanId: 'scan_00000000-0000-0000-0000-000000000001',
    businessId: BUSINESS_ID,
    provider: 'playwright',
    operation: 'screenshot',
    status: 'queued',
    attempt: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListScansForBusiness.mockResolvedValue([]);
  mockSend.mockResolvedValue({});
});

describe('captureExistingSiteScreenshot', () => {
  it('returns not_eligible when the business has no websiteUrl', async () => {
    mockGetBusinessById.mockResolvedValue({ businessId: BUSINESS_ID, websiteUrl: undefined });
    const result = await captureExistingSiteScreenshot(BUSINESS_ID);
    expect(result.status).toBe('not_eligible');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('creates a queued ScanEvent and invokes the Lambda asynchronously', async () => {
    mockGetBusinessById.mockResolvedValue({ businessId: BUSINESS_ID, websiteUrl: 'https://acme.com' });
    const result = await captureExistingSiteScreenshot(BUSINESS_ID);

    expect(result.status).toBe('queued');
    expect(mockPutScanEvent).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'playwright', operation: 'screenshot', targetType: 'existing_site', status: 'queued' }),
    );
    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.InvocationType).toBe('Event');
    const payload = JSON.parse(Buffer.from(command.input.Payload).toString());
    expect(payload).toMatchObject({ businessId: BUSINESS_ID, targetType: 'existing_site' });
    expect(payload.previewId).toBeUndefined();
  });

  it('returns conflict when an existing_site scan is already active', async () => {
    mockGetBusinessById.mockResolvedValue({ businessId: BUSINESS_ID, websiteUrl: 'https://acme.com' });
    mockListScansForBusiness.mockResolvedValue([makeScan({ targetType: 'existing_site', status: 'running' })]);
    const result = await captureExistingSiteScreenshot(BUSINESS_ID);
    expect(result.status).toBe('conflict');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('does not block on an active generated_preview scan for the same business', async () => {
    mockGetBusinessById.mockResolvedValue({ businessId: BUSINESS_ID, websiteUrl: 'https://acme.com' });
    mockListScansForBusiness.mockResolvedValue([makeScan({ targetType: 'generated_preview', status: 'running' })]);
    const result = await captureExistingSiteScreenshot(BUSINESS_ID);
    expect(result.status).toBe('queued');
  });

  it('marks the ScanEvent failed if the Lambda invoke call itself throws', async () => {
    mockGetBusinessById.mockResolvedValue({ businessId: BUSINESS_ID, websiteUrl: 'https://acme.com' });
    mockSend.mockRejectedValue(new Error('AccessDeniedException'));
    const result = await captureExistingSiteScreenshot(BUSINESS_ID);
    expect(result.status).toBe('failed');
    expect(mockPutScanEvent).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'failed', failureCategory: 'unknown' }));
  });
});

describe('captureGeneratedPreviewScreenshot', () => {
  it('returns not_eligible when the business has no preview yet', async () => {
    mockGetBusinessById.mockResolvedValue({ businessId: BUSINESS_ID });
    mockListPreviewsForBusiness.mockResolvedValue([]);
    const result = await captureGeneratedPreviewScreenshot(BUSINESS_ID);
    expect(result.status).toBe('not_eligible');
  });

  it('works even when the business has no website (previewId set, no sourceUrl)', async () => {
    const PREVIEW_ID = 'preview_00000000-0000-0000-0000-000000000099';
    const OLDER_PREVIEW_ID = 'preview_00000000-0000-0000-0000-000000000098';
    mockGetBusinessById.mockResolvedValue({ businessId: BUSINESS_ID, websiteUrl: undefined });
    mockListPreviewsForBusiness.mockResolvedValue([
      { previewId: PREVIEW_ID, version: 2 },
      { previewId: OLDER_PREVIEW_ID, version: 1 },
    ]);
    const result = await captureGeneratedPreviewScreenshot(BUSINESS_ID);

    expect(result.status).toBe('queued');
    expect(mockPutScanEvent).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'generated_preview', previewId: PREVIEW_ID }),
    );
    const command = mockSend.mock.calls[0][0];
    const payload = JSON.parse(Buffer.from(command.input.Payload).toString());
    expect(payload.previewId).toBe(PREVIEW_ID);
    expect(payload.sourceUrl).toBeUndefined();
  });
});

describe('isStaleScan', () => {
  it('is false for a fresh queued scan', () => {
    expect(isStaleScan(makeScan({ status: 'queued', createdAt: new Date().toISOString() }))).toBe(false);
  });

  it('is true for a queued scan older than the threshold', () => {
    const old = new Date(Date.now() - STALE_SCAN_THRESHOLD_MS - 1000).toISOString();
    expect(isStaleScan(makeScan({ status: 'running', createdAt: old }))).toBe(true);
  });

  it('is false for a terminal scan regardless of age', () => {
    const old = new Date(Date.now() - STALE_SCAN_THRESHOLD_MS - 1000).toISOString();
    expect(isStaleScan(makeScan({ status: 'completed', createdAt: old }))).toBe(false);
  });

  it('is false for a non-Playwright scan', () => {
    const old = new Date(Date.now() - STALE_SCAN_THRESHOLD_MS - 1000).toISOString();
    expect(isStaleScan(makeScan({ provider: 'firecrawl', status: 'running', createdAt: old }))).toBe(false);
  });
});

describe('markStaleScanFailed', () => {
  it('marks a genuinely stale scan failed', async () => {
    const old = new Date(Date.now() - STALE_SCAN_THRESHOLD_MS - 1000).toISOString();
    const scan = makeScan({ status: 'running', createdAt: old });
    mockListScansForBusiness.mockResolvedValue([scan]);
    const result = await markStaleScanFailed(BUSINESS_ID, scan.scanId);
    expect(result.status).toBe('marked_failed');
    expect(mockPutScanEvent).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });

  it('refuses to mark a non-stale scan failed', async () => {
    const scan = makeScan({ status: 'running', createdAt: new Date().toISOString() });
    mockListScansForBusiness.mockResolvedValue([scan]);
    const result = await markStaleScanFailed(BUSINESS_ID, scan.scanId);
    expect(result.status).toBe('not_eligible');
    expect(mockPutScanEvent).not.toHaveBeenCalled();
  });
});
