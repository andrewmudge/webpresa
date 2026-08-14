/**
 * Unit tests for POST /api/internal/scan/update-execution.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockVerifyInternalRequest = vi.hoisted(() => vi.fn());
const mockClaimScanExecutionStatus = vi.hoisted(() => vi.fn());

vi.mock('@/lib/internal-auth', () => ({ verifyInternalRequest: mockVerifyInternalRequest }));
vi.mock('@/lib/db/scan-executions', () => ({ claimScanExecutionStatus: mockClaimScanExecutionStatus }));

import { POST } from '@/app/api/internal/scan/update-execution/route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/internal/scan/update-execution', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyInternalRequest.mockResolvedValue(true);
});

describe('POST /api/internal/scan/update-execution', () => {
  it('returns 401 when the shared secret is missing or wrong', async () => {
    mockVerifyInternalRequest.mockResolvedValueOnce(false);

    const res = await POST(makeRequest({ scanExecutionId: 'scanexec_1', expectedCurrentStatus: 'queued', updates: {} }));

    expect(res.status).toBe(401);
    expect(mockClaimScanExecutionStatus).not.toHaveBeenCalled();
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ updates: {} }));
    expect(res.status).toBe(400);
    expect(mockClaimScanExecutionStatus).not.toHaveBeenCalled();
  });

  it('claims the transition and returns { claimed: true } on success', async () => {
    mockClaimScanExecutionStatus.mockResolvedValueOnce(true);

    const res = await POST(
      makeRequest({ scanExecutionId: 'scanexec_1', expectedCurrentStatus: 'queued', updates: { status: 'running' } }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ claimed: true });
    expect(mockClaimScanExecutionStatus).toHaveBeenCalledWith({
      scanExecutionId: 'scanexec_1',
      expectedCurrentStatus: 'queued',
      updates: { status: 'running' },
    });
  });

  it('returns { claimed: false } when the conditional transition loses the race', async () => {
    mockClaimScanExecutionStatus.mockResolvedValueOnce(false);

    const res = await POST(
      makeRequest({ scanExecutionId: 'scanexec_1', expectedCurrentStatus: 'queued', updates: { status: 'running' } }),
    );

    expect(await res.json()).toEqual({ claimed: false });
  });
});
