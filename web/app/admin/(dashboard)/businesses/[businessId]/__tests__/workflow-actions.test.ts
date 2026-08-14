/**
 * Unit tests for the Stage 16 admin trigger Server Actions
 * (runScanWorkflowAction / rerunScanWorkflowAction). All auth and
 * Step Functions interactions are mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetSession, mockStartScanWorkflow, mockRerunScanWorkflow, mockMarkStaleExecutionFailed } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockStartScanWorkflow: vi.fn(),
  mockRerunScanWorkflow: vi.fn(),
  mockMarkStaleExecutionFailed: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/lib/workflow/run-scan-workflow', () => ({
  startScanWorkflow: mockStartScanWorkflow,
  rerunScanWorkflow: mockRerunScanWorkflow,
}));
vi.mock('@/lib/workflow/stale', () => ({ markStaleExecutionFailed: mockMarkStaleExecutionFailed }));

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { runScanWorkflowAction, rerunScanWorkflowAction, markStaleExecutionFailedAction } from '@/app/admin/(dashboard)/businesses/[businessId]/workflow-actions';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ sub: 'admin', expiresAt: new Date().toISOString() });
});

describe('runScanWorkflowAction', () => {
  it('throws Unauthorized when there is no session, without starting a workflow', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    await expect(runScanWorkflowAction('biz_1')).rejects.toThrow('Unauthorized');
    expect(mockStartScanWorkflow).not.toHaveBeenCalled();
  });

  it('starts the workflow as the signed-in admin and redirects with the outcome status', async () => {
    mockStartScanWorkflow.mockResolvedValueOnce({ status: 'started', scanExecutionId: 'scanexec_1' });

    await expect(runScanWorkflowAction('biz_1')).rejects.toThrow('REDIRECT:/admin/businesses/biz_1?workflowResult=started');

    expect(mockStartScanWorkflow).toHaveBeenCalledWith('biz_1', 'admin');
  });

  it('redirects with a conflict status when a workflow is already active', async () => {
    mockStartScanWorkflow.mockResolvedValueOnce({ status: 'conflict' });
    await expect(runScanWorkflowAction('biz_1')).rejects.toThrow('workflowResult=conflict');
  });
});

describe('rerunScanWorkflowAction', () => {
  it('throws Unauthorized when there is no session, without rerunning', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    await expect(rerunScanWorkflowAction('biz_1', 'scanexec_1')).rejects.toThrow('Unauthorized');
    expect(mockRerunScanWorkflow).not.toHaveBeenCalled();
  });

  it('reruns the prior execution as the signed-in admin and redirects with the outcome status', async () => {
    mockRerunScanWorkflow.mockResolvedValueOnce({ status: 'started', scanExecutionId: 'scanexec_2' });

    await expect(rerunScanWorkflowAction('biz_1', 'scanexec_1')).rejects.toThrow('workflowResult=started');

    expect(mockRerunScanWorkflow).toHaveBeenCalledWith('biz_1', 'scanexec_1', 'admin', 'Rerun requested by admin');
  });
});

describe('markStaleExecutionFailedAction', () => {
  it('throws Unauthorized when there is no session, without marking anything failed', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    await expect(markStaleExecutionFailedAction('biz_1', 'scanexec_1')).rejects.toThrow('Unauthorized');
    expect(mockMarkStaleExecutionFailed).not.toHaveBeenCalled();
  });

  it('marks the execution failed and redirects with the outcome status', async () => {
    mockMarkStaleExecutionFailed.mockResolvedValueOnce({ status: 'marked_failed' });

    await expect(markStaleExecutionFailedAction('biz_1', 'scanexec_1')).rejects.toThrow('workflowResult=marked_failed');

    expect(mockMarkStaleExecutionFailed).toHaveBeenCalledWith('biz_1', 'scanexec_1');
  });
});
