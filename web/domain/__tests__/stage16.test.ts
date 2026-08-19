/**
 * Domain-layer tests for Stage 16 (Step Functions Scan and Preview
 * Workflow): the new ScanExecution record, its factory, and the new
 * Business rollup fields (latestScanExecutionId, scanExecutionStatus,
 * scanExecutionUpdatedAt).
 */
import { describe, it, expect } from 'vitest';
import { createBusiness } from '@/domain/factories/business.factory';
import { createScanExecution } from '@/domain/factories/scan-execution.factory';
import { ScanExecutionSchema } from '@/domain/schemas/scan-execution.schema';
import { BusinessSchema } from '@/domain/schemas/business.schema';

describe('ScanExecution factory', () => {
  it('creates a queued, attempt-1 execution with no parent', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const execution = createScanExecution({
      businessId: biz.businessId,
      triggerSource: 'admin_manual',
      requestedBy: 'admin',
    });

    expect(execution.status).toBe('queued');
    expect(execution.attemptNumber).toBe(1);
    expect(execution.parentScanExecutionId).toBeUndefined();
    expect(execution.scanExecutionId).toMatch(/^scanexec_/);
    expect(() => ScanExecutionSchema.parse(execution)).not.toThrow();
  });

  it('creates a rerun execution referencing its parent with an incremented attempt', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const first = createScanExecution({ businessId: biz.businessId, triggerSource: 'admin_manual', requestedBy: 'admin' });
    const rerun = createScanExecution({
      businessId: biz.businessId,
      triggerSource: 'admin_manual',
      requestedBy: 'admin',
      parentScanExecutionId: first.scanExecutionId,
      attemptNumber: first.attemptNumber + 1,
      rerunReason: 'Retrying after a transient Firecrawl timeout.',
    });

    expect(rerun.parentScanExecutionId).toBe(first.scanExecutionId);
    expect(rerun.attemptNumber).toBe(2);
    expect(rerun.rerunReason).toMatch(/timeout/i);
    expect(() => ScanExecutionSchema.parse(rerun)).not.toThrow();
  });

  it('accepts a terminal execution with qualification, leadPriority, and a preview reference', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const execution = createScanExecution({ businessId: biz.businessId, triggerSource: 'admin_manual', requestedBy: 'admin' });
    const terminal = {
      ...execution,
      status: 'preview_ready' as const,
      currentStep: 'finalizing' as const,
      crawlScanId: 'scan_00000000-0000-0000-0000-000000000001',
      scoreScanId: 'scan_00000000-0000-0000-0000-000000000002',
      previewScreenshotScanId: 'scan_00000000-0000-0000-0000-000000000003',
      previewId: 'preview_00000000-0000-0000-0000-000000000001',
      qualification: 'qualified' as const,
      leadPriority: 'high' as const,
      completedAt: new Date().toISOString(),
    };
    expect(() => ScanExecutionSchema.parse(terminal)).not.toThrow();
  });

  it('normalizes a literal null qualification/leadPriority (Step Functions cannot omit an unresolved JSONPath) to undefined', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const execution = createScanExecution({ businessId: biz.businessId, triggerSource: 'admin_manual', requestedBy: 'admin' });
    const noWebsiteTerminal = {
      ...execution,
      status: 'qualified' as const,
      qualification: null,
      leadPriority: null,
    };

    const parsed = ScanExecutionSchema.parse(noWebsiteTerminal);
    expect(parsed.qualification).toBeUndefined();
    expect(parsed.leadPriority).toBeUndefined();
  });

  it('accepts a failed execution with a structured ScanWorkflowFailure', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const execution = createScanExecution({ businessId: biz.businessId, triggerSource: 'admin_manual', requestedBy: 'admin' });
    const failed = {
      ...execution,
      status: 'failed' as const,
      failure: {
        step: 'crawling' as const,
        category: 'provider_timeout' as const,
        safeMessage: 'Firecrawl timed out after retries were exhausted.',
        provider: 'firecrawl' as const,
        occurredAt: new Date().toISOString(),
        attemptCount: 3,
        retryEligible: true,
      },
      completedAt: new Date().toISOString(),
    };
    expect(() => ScanExecutionSchema.parse(failed)).not.toThrow();
  });

  it('rejects an invalid status', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const execution = createScanExecution({ businessId: biz.businessId, triggerSource: 'admin_manual', requestedBy: 'admin' });
    expect(() => ScanExecutionSchema.parse({ ...execution, status: 'not_a_real_status' })).toThrow();
  });
});

describe('Business Stage 16 rollup fields', () => {
  it('accepts a business carrying the new workflow rollup fields', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const withWorkflow = {
      ...biz,
      latestScanExecutionId: 'scanexec_00000000-0000-0000-0000-000000000001',
      scanExecutionStatus: 'preview_ready' as const,
      scanExecutionUpdatedAt: new Date().toISOString(),
    };
    expect(() => BusinessSchema.parse(withWorkflow)).not.toThrow();
  });

  it('remains valid without any Stage 16 fields set (pre-existing businesses)', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    expect(() => BusinessSchema.parse(biz)).not.toThrow();
  });
});
