/**
 * Unit tests for `disconnectDomainConnectionForCustomer` — the customer-
 * facing "change domain" primitive (Settings → Domain). Deliberately a hard
 * delete, not a soft `status: 'disconnected'` flip — see the function's own
 * doc comment for why a soft flip would break re-connecting the same domain.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockList, mockDelete, mockRemoveProjectDomain } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockDelete: vi.fn(),
  mockRemoveProjectDomain: vi.fn(),
}));

vi.mock('@/lib/db/domain-connections', () => ({
  listDomainConnectionsForBusiness: mockList,
  deleteDomainConnectionRecord: mockDelete,
}));

vi.mock('@/lib/vercel/domains', () => ({
  removeProjectDomain: mockRemoveProjectDomain,
}));

import { disconnectDomainConnectionForCustomer } from '@/lib/domains/disconnect';

const BUSINESS_ID = 'biz_1';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('disconnectDomainConnectionForCustomer', () => {
  it('reports nothing to disconnect when there is no active connection', async () => {
    mockList.mockResolvedValueOnce([]);

    const result = await disconnectDomainConnectionForCustomer(BUSINESS_ID);

    expect(result).toEqual({ disconnected: false, message: 'No domain connection to remove.' });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('ignores an already-disconnected record and reports nothing to disconnect', async () => {
    mockList.mockResolvedValueOnce([{ normalizedDomain: 'old.com', status: 'disconnected', primaryHostname: 'old.com' }]);

    const result = await disconnectDomainConnectionForCustomer(BUSINESS_ID);

    expect(result.disconnected).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('removes the Vercel attachment and hard-deletes the active connection', async () => {
    mockList.mockResolvedValueOnce([{ normalizedDomain: 'coastalplumbing.com', status: 'active', primaryHostname: 'coastalplumbing.com' }]);
    mockRemoveProjectDomain.mockResolvedValueOnce(undefined);

    const result = await disconnectDomainConnectionForCustomer(BUSINESS_ID);

    expect(mockRemoveProjectDomain).toHaveBeenCalledWith('coastalplumbing.com');
    expect(mockDelete).toHaveBeenCalledWith('coastalplumbing.com');
    expect(result).toEqual({ disconnected: true });
  });

  it('still deletes the record when the Vercel removal fails (best-effort)', async () => {
    mockList.mockResolvedValueOnce([{ normalizedDomain: 'coastalplumbing.com', status: 'active', primaryHostname: 'coastalplumbing.com' }]);
    mockRemoveProjectDomain.mockRejectedValueOnce(new Error('Vercel unreachable'));

    const result = await disconnectDomainConnectionForCustomer(BUSINESS_ID);

    expect(mockDelete).toHaveBeenCalledWith('coastalplumbing.com');
    expect(result).toEqual({ disconnected: true });
  });
});
