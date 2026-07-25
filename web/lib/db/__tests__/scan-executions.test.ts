/**
 * Unit tests for the ScanExecution repository.
 * All DynamoDB interactions are mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

const mockSend = vi.fn();

vi.mock('@/lib/db/client', () => ({
  getDynamoDBClient: () => ({ send: mockSend }),
  TABLE_SCAN_EXECUTIONS: () => 'webpresa-test-scan-executions',
}));

vi.mock('server-only', () => ({}));

import {
  getScanExecutionById,
  listScanExecutionsForBusiness,
  putScanExecution,
  claimScanExecutionStatus,
} from '@/lib/db/scan-executions';
import { createScanExecution } from '@/domain/factories/scan-execution.factory';

function makeExecution(overrides = {}) {
  return createScanExecution({
    businessId: 'biz_00000000-0000-0000-0000-000000000001',
    triggerSource: 'admin_manual',
    requestedBy: 'admin',
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getScanExecutionById', () => {
  it('returns a parsed ScanExecution when the item exists', async () => {
    const execution = makeExecution();
    mockSend.mockResolvedValueOnce({ Item: execution });

    const result = await getScanExecutionById(execution.scanExecutionId);

    expect(result?.scanExecutionId).toBe(execution.scanExecutionId);
    expect(result?.status).toBe('queued');
  });

  it('returns null when the item does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });
    expect(await getScanExecutionById('scanexec_notfound')).toBeNull();
  });

  it('throws if DynamoDB returns an invalid record', async () => {
    mockSend.mockResolvedValueOnce({ Item: { scanExecutionId: 'bad' } });
    await expect(getScanExecutionById('bad')).rejects.toThrow();
  });
});

describe('listScanExecutionsForBusiness', () => {
  it('queries the business-id-index, newest first', async () => {
    const execution = makeExecution();
    mockSend.mockResolvedValueOnce({ Items: [execution] });

    const result = await listScanExecutionsForBusiness(execution.businessId);

    expect(result).toHaveLength(1);
    expect(mockSend).toHaveBeenCalledOnce();
    const command = mockSend.mock.calls[0][0];
    expect(command.input.IndexName).toBe('business-id-index');
    expect(command.input.ScanIndexForward).toBe(false);
  });

  it('returns an empty array when there are no items', async () => {
    mockSend.mockResolvedValueOnce({ Items: undefined });
    expect(await listScanExecutionsForBusiness('biz_none')).toEqual([]);
  });
});

describe('putScanExecution', () => {
  it('validates and persists a full record', async () => {
    const execution = makeExecution();
    mockSend.mockResolvedValueOnce({});

    await putScanExecution(execution);

    expect(mockSend).toHaveBeenCalledOnce();
    const command = mockSend.mock.calls[0][0];
    expect(command.input.Item.scanExecutionId).toBe(execution.scanExecutionId);
  });

  it('throws on an invalid record without calling DynamoDB', async () => {
    const invalid = { ...makeExecution(), status: 'not_a_real_status' };
    await expect(putScanExecution(invalid as never)).rejects.toThrow();
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('claimScanExecutionStatus', () => {
  it('returns true and sends a conditional UpdateCommand on success', async () => {
    mockSend.mockResolvedValueOnce({});

    const result = await claimScanExecutionStatus({
      scanExecutionId: 'scanexec_00000000-0000-0000-0000-000000000001',
      expectedCurrentStatus: 'queued',
      updates: { status: 'running', currentStep: 'initializing' },
    });

    expect(result).toBe(true);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.ConditionExpression).toBe('#status = :expectedStatus');
    expect(command.input.ExpressionAttributeValues[':expectedStatus']).toBe('queued');
    expect(command.input.ExpressionAttributeValues[':status']).toBe('running');
    expect(command.input.ExpressionAttributeValues[':currentStep']).toBe('initializing');
  });

  it('returns false (does not throw) when the condition fails — another invocation already won the race', async () => {
    mockSend.mockRejectedValueOnce(
      new ConditionalCheckFailedException({ message: 'conditional check failed', $metadata: {} }),
    );

    const result = await claimScanExecutionStatus({
      scanExecutionId: 'scanexec_00000000-0000-0000-0000-000000000001',
      expectedCurrentStatus: 'queued',
      updates: { status: 'running' },
    });

    expect(result).toBe(false);
  });

  it('rethrows any other error', async () => {
    mockSend.mockRejectedValueOnce(new Error('network blip'));

    await expect(
      claimScanExecutionStatus({
        scanExecutionId: 'scanexec_00000000-0000-0000-0000-000000000001',
        expectedCurrentStatus: 'queued',
        updates: { status: 'running' },
      }),
    ).rejects.toThrow('network blip');
  });
});
