/**
 * Unit tests for `startDomainConnection` — in particular the
 * conditional-write uniqueness guarantee (implementation.md, Stage 19.x,
 * Part 2, "Why normalizedDomain is the partition key, not a GSI").
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockGetByDomain, mockCreateRecord, mockPut, mockAddProjectDomain } = vi.hoisted(() => ({
  mockGetByDomain: vi.fn(),
  mockCreateRecord: vi.fn(),
  mockPut: vi.fn(),
  mockAddProjectDomain: vi.fn(),
}));

vi.mock('@/lib/db/domain-connections', () => ({
  getDomainConnectionByNormalizedDomain: mockGetByDomain,
  createDomainConnectionRecord: mockCreateRecord,
  putDomainConnection: mockPut,
}));

vi.mock('@/lib/vercel/domains', () => ({
  addProjectDomain: mockAddProjectDomain,
  buildRoutingInstructions: () => [{ recordType: 'A', name: '@', value: '76.76.21.21', purpose: 'routing', required: true }],
}));

import { startDomainConnection } from '@/lib/domains/connect';

const PARAMS = {
  businessId: 'biz_1',
  ownerUserId: 'user_1',
  slug: 'coastal-plumbing',
  rawDomain: 'coastalplumbing.com',
};

beforeEach(() => {
  mockGetByDomain.mockReset();
  mockCreateRecord.mockReset();
  mockPut.mockReset();
  mockAddProjectDomain.mockReset();
});

describe('startDomainConnection', () => {
  it('rejects an invalid domain before touching the database', async () => {
    const result = await startDomainConnection({ ...PARAMS, rawDomain: 'not a domain' });
    expect(result.outcome).toBe('invalid');
    expect(mockGetByDomain).not.toHaveBeenCalled();
  });

  it('rejects a reserved host', async () => {
    const result = await startDomainConnection({ ...PARAMS, rawDomain: 'webpresa.com' });
    expect(result.outcome).toBe('invalid');
  });

  it('rejects a domain already assigned to a different business', async () => {
    mockGetByDomain.mockResolvedValueOnce({ businessId: 'biz_OTHER', status: 'active' });

    const result = await startDomainConnection(PARAMS);

    expect(result.outcome).toBe('already_assigned');
    expect(mockCreateRecord).not.toHaveBeenCalled();
  });

  it('creates and attaches a new domain on the happy path', async () => {
    mockGetByDomain.mockResolvedValueOnce(null);
    mockCreateRecord.mockResolvedValueOnce(true);
    mockAddProjectDomain
      .mockResolvedValueOnce({
        vercelProjectDomainId: 'coastalplumbing.com',
        verified: false,
        verificationRecords: [],
      })
      .mockResolvedValueOnce({
        vercelProjectDomainId: 'www.coastalplumbing.com',
        verified: false,
        verificationRecords: [],
      });

    const result = await startDomainConnection(PARAMS);

    expect(result.outcome).toBe('connected');
    if (result.outcome === 'connected') {
      expect(result.connection.status).toBe('awaiting_dns');
      expect(result.connection.normalizedDomain).toBe('coastalplumbing.com');
      expect(result.connection.providerDomains).toEqual([
        expect.objectContaining({ hostname: 'coastalplumbing.com' }),
        expect.objectContaining({ hostname: 'www.coastalplumbing.com' }),
      ]);
    }
    expect(mockAddProjectDomain).toHaveBeenCalledWith('www.coastalplumbing.com', expect.objectContaining({ redirect: 'coastalplumbing.com' }));
    expect(mockPut).toHaveBeenCalled();
  });

  it('still connects the apex successfully even when registering the www alias fails', async () => {
    mockGetByDomain.mockResolvedValueOnce(null);
    mockCreateRecord.mockResolvedValueOnce(true);
    mockAddProjectDomain
      .mockResolvedValueOnce({
        vercelProjectDomainId: 'coastalplumbing.com',
        verified: false,
        verificationRecords: [],
      })
      .mockRejectedValueOnce(new Error('www already in use elsewhere'));

    const result = await startDomainConnection(PARAMS);

    expect(result.outcome).toBe('connected');
    if (result.outcome === 'connected') {
      expect(result.connection.status).toBe('awaiting_dns');
      expect(result.connection.providerDomains).toEqual([
        expect.objectContaining({ hostname: 'coastalplumbing.com' }),
      ]);
    }
  });

  it('resolves a lost conditional-write race by re-reading the winner — same business resumes cleanly', async () => {
    // Two concurrent requests for the same domain: this call's create loses,
    // but the winner turns out to be the same business (a legitimate resume).
    mockGetByDomain.mockResolvedValueOnce(null); // initial check
    mockCreateRecord.mockResolvedValueOnce(false); // lost the race
    mockGetByDomain.mockResolvedValueOnce({
      normalizedDomain: 'coastalplumbing.com',
      businessId: 'biz_1',
      status: 'awaiting_dns',
    });

    const result = await startDomainConnection(PARAMS);

    expect(result.outcome).toBe('connected');
    expect(mockAddProjectDomain).not.toHaveBeenCalled(); // already attached — nothing more to do
  });

  it('resolves a lost conditional-write race against a different business as already_assigned', async () => {
    mockGetByDomain.mockResolvedValueOnce(null);
    mockCreateRecord.mockResolvedValueOnce(false);
    mockGetByDomain.mockResolvedValueOnce({ normalizedDomain: 'coastalplumbing.com', businessId: 'biz_OTHER', status: 'draft' });

    const result = await startDomainConnection(PARAMS);

    expect(result.outcome).toBe('already_assigned');
  });

  it('marks the record failed (not left dangling) when the Vercel attach call throws', async () => {
    mockGetByDomain.mockResolvedValueOnce(null);
    mockCreateRecord.mockResolvedValueOnce(true);
    mockAddProjectDomain.mockRejectedValueOnce(new Error('boom'));

    const result = await startDomainConnection(PARAMS);

    expect(result.outcome).toBe('provider_error');
    expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });
});
