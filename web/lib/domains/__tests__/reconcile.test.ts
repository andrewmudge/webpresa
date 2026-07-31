/**
 * Unit tests for `reconcileDomainConnection` — status-transition validity
 * (implementation.md, Stage 19.x, Part 2, "Status transitions"). No
 * client-controlled transition is ever accepted; every transition here is
 * derived from a (mocked) live provider check.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockGetByDomain, mockPut, mockGetStatus } = vi.hoisted(() => ({
  mockGetByDomain: vi.fn(),
  mockPut: vi.fn(),
  mockGetStatus: vi.fn(),
}));

vi.mock('@/lib/db/domain-connections', () => ({
  getDomainConnectionByNormalizedDomain: mockGetByDomain,
  putDomainConnection: mockPut,
}));

vi.mock('@/lib/vercel/domains', () => ({
  getProjectDomainStatus: mockGetStatus,
}));

import { reconcileDomainConnection } from '@/lib/domains/reconcile';

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    normalizedDomain: 'coastalplumbing.com',
    domainConnectionId: 'domain_1',
    businessId: 'biz_1',
    ownerUserId: 'user_1',
    domainName: 'coastalplumbing.com',
    slug: 'coastal-plumbing',
    source: 'customer_owned',
    status: 'awaiting_dns',
    isPrimary: true,
    desiredRedirect: 'www_to_apex',
    primaryHostname: 'coastalplumbing.com',
    aliasHostnames: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  mockGetByDomain.mockReset();
  mockPut.mockReset();
  mockGetStatus.mockReset();
});

describe('reconcileDomainConnection', () => {
  it('returns null when no record exists', async () => {
    mockGetByDomain.mockResolvedValueOnce(null);
    const result = await reconcileDomainConnection('coastalplumbing.com');
    expect(result).toBeNull();
    expect(mockGetStatus).not.toHaveBeenCalled();
  });

  it('never queries the provider once a record is in a terminal status', async () => {
    mockGetByDomain.mockResolvedValueOnce(makeRecord({ status: 'active' }));
    const result = await reconcileDomainConnection('coastalplumbing.com');
    expect(result?.status).toBe('active');
    expect(mockGetStatus).not.toHaveBeenCalled();
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('stays awaiting_dns while unverified', async () => {
    mockGetByDomain.mockResolvedValueOnce(makeRecord({ status: 'awaiting_dns' }));
    mockGetStatus.mockResolvedValueOnce({ verified: false, misconfigured: true, verificationRecords: [] });

    const result = await reconcileDomainConnection('coastalplumbing.com');

    expect(result?.status).toBe('awaiting_dns');
  });

  it('moves to verifying when verified but still misconfigured', async () => {
    mockGetByDomain.mockResolvedValueOnce(makeRecord({ status: 'awaiting_dns' }));
    mockGetStatus.mockResolvedValueOnce({ verified: true, misconfigured: true, verificationRecords: [] });

    const result = await reconcileDomainConnection('coastalplumbing.com');

    expect(result?.status).toBe('verifying');
  });

  it('moves to connected on the first fully-verified check', async () => {
    mockGetByDomain.mockResolvedValueOnce(makeRecord({ status: 'verifying' }));
    mockGetStatus.mockResolvedValueOnce({ verified: true, misconfigured: false, verificationRecords: [] });

    const result = await reconcileDomainConnection('coastalplumbing.com');

    expect(result?.status).toBe('connected');
    expect(result?.activatedAt).toBeUndefined();
  });

  it('moves to active on a second consecutive fully-verified check', async () => {
    mockGetByDomain.mockResolvedValueOnce(makeRecord({ status: 'connected' }));
    mockGetStatus.mockResolvedValueOnce({ verified: true, misconfigured: false, verificationRecords: [] });

    const result = await reconcileDomainConnection('coastalplumbing.com');

    expect(result?.status).toBe('active');
    expect(result?.activatedAt).toBeTruthy();
    expect(result?.certificateReadyAt).toBeTruthy();
  });

  it('records a safe failure category without leaking the raw provider error when the check throws', async () => {
    mockGetByDomain.mockResolvedValueOnce(makeRecord({ status: 'awaiting_dns' }));
    mockGetStatus.mockRejectedValueOnce(new Error('raw provider stack trace, should never be stored'));

    const result = await reconcileDomainConnection('coastalplumbing.com');

    expect(result?.failureCategory).toBe('unknown');
    expect(JSON.stringify(result)).not.toContain('stack trace');
  });
});
