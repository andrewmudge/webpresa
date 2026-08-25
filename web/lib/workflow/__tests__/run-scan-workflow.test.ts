/**
 * Unit tests for startScanWorkflow / rerunScanWorkflow — the Stage 16 admin
 * trigger's underlying orchestration. All DynamoDB and Step Functions
 * interactions are mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createScanExecution } from '@/domain/factories/scan-execution.factory';

const {
  mockGetBusinessById,
  mockListScanExecutionsForBusiness,
  mockPutScanExecution,
  mockSfnSend,
} = vi.hoisted(() => ({
  mockGetBusinessById: vi.fn(),
  mockListScanExecutionsForBusiness: vi.fn(),
  mockPutScanExecution: vi.fn(),
  mockSfnSend: vi.fn(),
}));

vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById }));
vi.mock('@/lib/db/scan-executions', () => ({
  listScanExecutionsForBusiness: mockListScanExecutionsForBusiness,
  putScanExecution: mockPutScanExecution,
}));
vi.mock('@/lib/stepfunctions/client', () => ({
  getStepFunctionsClient: () => ({ send: mockSfnSend }),
  getScanWorkflowStateMachineArn: () => 'arn:aws:states:us-east-1:123456789012:stateMachine:webpresa-dev-scan-workflow',
}));
vi.mock('server-only', () => ({}));

import { startScanWorkflow, rerunScanWorkflow, SCAN_WORKFLOW_CONFLICT_MESSAGE } from '@/lib/workflow/run-scan-workflow';

const BUSINESS_ID = 'biz_00000000-0000-0000-0000-000000000001';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetBusinessById.mockResolvedValue({ businessId: BUSINESS_ID });
  mockListScanExecutionsForBusiness.mockResolvedValue([]);
  mockSfnSend.mockResolvedValue({ executionArn: 'arn:aws:states:us-east-1:123456789012:execution:webpresa-dev-scan-workflow:x' });
});

describe('startScanWorkflow', () => {
  it('returns failed when the business does not exist', async () => {
    mockGetBusinessById.mockResolvedValueOnce(null);
    const result = await startScanWorkflow(BUSINESS_ID, 'admin');
    expect(result.status).toBe('failed');
    expect(mockSfnSend).not.toHaveBeenCalled();
  });

  it('returns conflict when a queued or running execution already exists', async () => {
    mockListScanExecutionsForBusiness.mockResolvedValueOnce([
      createScanExecution({ businessId: BUSINESS_ID, triggerSource: 'admin_manual', requestedBy: 'admin' }),
    ]);

    const result = await startScanWorkflow(BUSINESS_ID, 'admin');

    expect(result.status).toBe('conflict');
    expect(result.message).toBe(SCAN_WORKFLOW_CONFLICT_MESSAGE);
    expect(mockSfnSend).not.toHaveBeenCalled();
  });

  it('creates a queued ScanExecution, starts the Step Functions execution, and persists the returned ARN', async () => {
    const result = await startScanWorkflow(BUSINESS_ID, 'admin');

    expect(result.status).toBe('started');
    expect(result.scanExecutionId).toMatch(/^scanexec_/);

    // First put: the initial queued record.
    expect(mockPutScanExecution).toHaveBeenCalledTimes(2);
    const [firstPutArg] = mockPutScanExecution.mock.calls[0];
    expect(firstPutArg.status).toBe('queued');
    expect(firstPutArg.requestedBy).toBe('admin');

    // StartExecutionCommand input carries businessId + scanExecutionId.
    const startCommand = mockSfnSend.mock.calls[0][0];
    const input = JSON.parse(startCommand.input.input);
    expect(input.businessId).toBe(BUSINESS_ID);
    expect(input.scanExecutionId).toBe(result.scanExecutionId);

    // Second put: persists the executionArn returned by StartExecution.
    const [secondPutArg] = mockPutScanExecution.mock.calls[1];
    expect(secondPutArg.executionArn).toBe('arn:aws:states:us-east-1:123456789012:execution:webpresa-dev-scan-workflow:x');
  });

  it('defaults triggerSource to admin_manual when omitted', async () => {
    await startScanWorkflow(BUSINESS_ID, 'admin');
    const [firstPutArg] = mockPutScanExecution.mock.calls[0];
    expect(firstPutArg.triggerSource).toBe('admin_manual');
  });

  it('accepts an explicit self_service triggerSource for the self-service build orchestration', async () => {
    const result = await startScanWorkflow(BUSINESS_ID, BUSINESS_ID, 'self_service');
    expect(result.status).toBe('started');
    const [firstPutArg] = mockPutScanExecution.mock.calls[0];
    expect(firstPutArg.triggerSource).toBe('self_service');
    expect(firstPutArg.requestedBy).toBe(BUSINESS_ID);
  });

  it('marks the execution failed when StartExecution itself throws, without leaking the raw error', async () => {
    mockSfnSend.mockRejectedValueOnce(new Error('AccessDeniedException: not authorized'));

    const result = await startScanWorkflow(BUSINESS_ID, 'admin');

    expect(result.status).toBe('failed');
    const [, failedPutArg] = mockPutScanExecution.mock.calls;
    expect(failedPutArg[0].status).toBe('failed');
    expect(failedPutArg[0].failure.safeMessage).not.toContain('AccessDeniedException');
  });
});

describe('rerunScanWorkflow', () => {
  it('returns conflict when the prior execution has not finished yet', async () => {
    const previous = createScanExecution({ businessId: BUSINESS_ID, triggerSource: 'admin_manual', requestedBy: 'admin' });
    mockListScanExecutionsForBusiness.mockResolvedValueOnce([{ ...previous, status: 'running' }]);

    const result = await rerunScanWorkflow(BUSINESS_ID, previous.scanExecutionId, 'admin');

    expect(result.status).toBe('conflict');
    expect(mockSfnSend).not.toHaveBeenCalled();
  });

  it('returns failed when the prior execution cannot be found', async () => {
    mockListScanExecutionsForBusiness.mockResolvedValueOnce([]);
    const result = await rerunScanWorkflow(BUSINESS_ID, 'scanexec_missing', 'admin');
    expect(result.status).toBe('failed');
  });

  it('creates a new execution referencing the prior one, with an incremented attempt number', async () => {
    const previous = { ...createScanExecution({ businessId: BUSINESS_ID, triggerSource: 'admin_manual', requestedBy: 'admin' }), status: 'failed' as const };
    mockListScanExecutionsForBusiness.mockResolvedValueOnce([previous]);

    const result = await rerunScanWorkflow(BUSINESS_ID, previous.scanExecutionId, 'admin', 'Retrying after a fix');

    expect(result.status).toBe('started');
    const [firstPutArg] = mockPutScanExecution.mock.calls[0];
    expect(firstPutArg.parentScanExecutionId).toBe(previous.scanExecutionId);
    expect(firstPutArg.attemptNumber).toBe(2);
    expect(firstPutArg.rerunReason).toBe('Retrying after a fix');
  });
});
