/**
 * Unit tests for Stage 24 ScanExecution staleness detection, mirroring
 * `lib/screenshots/__tests__/capture.test.ts`'s coverage of `isStaleScan`/
 * `markStaleScanFailed`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockListScanExecutionsForBusiness = vi.hoisted(() => vi.fn());
const mockClaimScanExecutionStatus = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db/scan-executions', () => ({
  listScanExecutionsForBusiness: mockListScanExecutionsForBusiness,
  claimScanExecutionStatus: mockClaimScanExecutionStatus,
}));
vi.mock('server-only', () => ({}));

import { isStaleExecution, markStaleExecutionFailed, STALE_EXECUTION_THRESHOLD_MS } from '../stale';
import type { ScanExecution } from '@/domain/models/scan-execution';

const BUSINESS_ID = 'biz_00000000-0000-0000-0000-000000000001';

function makeExecution(overrides: Partial<ScanExecution> = {}): ScanExecution {
  return {
    scanExecutionId: 'scanexec_00000000-0000-0000-0000-000000000001',
    businessId: BUSINESS_ID,
    status: 'running',
    triggerSource: 'admin_manual',
    requestedBy: 'admin',
    attemptNumber: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('isStaleExecution', () => {
  it('is false for a fresh running execution', () => {
    expect(isStaleExecution(makeExecution({ status: 'running', createdAt: new Date().toISOString() }))).toBe(false);
  });

  it('is true for a running execution older than the threshold', () => {
    const old = new Date(Date.now() - STALE_EXECUTION_THRESHOLD_MS - 1000).toISOString();
    expect(isStaleExecution(makeExecution({ status: 'running', createdAt: old }))).toBe(true);
  });

  it('is true for a queued execution older than the threshold', () => {
    const old = new Date(Date.now() - STALE_EXECUTION_THRESHOLD_MS - 1000).toISOString();
    expect(isStaleExecution(makeExecution({ status: 'queued', createdAt: old }))).toBe(true);
  });

  it('is false for a terminal execution regardless of age', () => {
    const old = new Date(Date.now() - STALE_EXECUTION_THRESHOLD_MS - 1000).toISOString();
    expect(isStaleExecution(makeExecution({ status: 'failed', createdAt: old }))).toBe(false);
    expect(isStaleExecution(makeExecution({ status: 'preview_ready', createdAt: old }))).toBe(false);
  });
});

describe('markStaleExecutionFailed', () => {
  it('returns failed when the execution does not exist', async () => {
    mockListScanExecutionsForBusiness.mockResolvedValue([]);
    const result = await markStaleExecutionFailed(BUSINESS_ID, 'scanexec_missing');
    expect(result.status).toBe('failed');
    expect(mockClaimScanExecutionStatus).not.toHaveBeenCalled();
  });

  it('returns not_eligible when the execution is not actually stale', async () => {
    const execution = makeExecution({ status: 'running', createdAt: new Date().toISOString() });
    mockListScanExecutionsForBusiness.mockResolvedValue([execution]);
    const result = await markStaleExecutionFailed(BUSINESS_ID, execution.scanExecutionId);
    expect(result.status).toBe('not_eligible');
    expect(mockClaimScanExecutionStatus).not.toHaveBeenCalled();
  });

  it('claims the execution failed when it is genuinely stale', async () => {
    const old = new Date(Date.now() - STALE_EXECUTION_THRESHOLD_MS - 1000).toISOString();
    const execution = makeExecution({ status: 'running', createdAt: old });
    mockListScanExecutionsForBusiness.mockResolvedValue([execution]);
    mockClaimScanExecutionStatus.mockResolvedValue(true);

    const result = await markStaleExecutionFailed(BUSINESS_ID, execution.scanExecutionId);

    expect(result.status).toBe('marked_failed');
    expect(mockClaimScanExecutionStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        scanExecutionId: execution.scanExecutionId,
        expectedCurrentStatus: 'running',
        updates: expect.objectContaining({ status: 'failed' }),
      }),
    );
  });

  it('returns not_eligible when the conditional claim loses the race', async () => {
    const old = new Date(Date.now() - STALE_EXECUTION_THRESHOLD_MS - 1000).toISOString();
    const execution = makeExecution({ status: 'running', createdAt: old });
    mockListScanExecutionsForBusiness.mockResolvedValue([execution]);
    mockClaimScanExecutionStatus.mockResolvedValue(false);

    const result = await markStaleExecutionFailed(BUSINESS_ID, execution.scanExecutionId);
    expect(result.status).toBe('not_eligible');
  });
});
