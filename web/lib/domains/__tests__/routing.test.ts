/**
 * Unit tests for `resolveActiveDomainRoute` — reserved/unknown hosts must
 * never trigger a tenant lookup or fall through to another business
 * (implementation.md, Stage 19.x, Part 2, "Multi-tenant custom-domain
 * routing").
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockGetByDomain } = vi.hoisted(() => ({ mockGetByDomain: vi.fn() }));

vi.mock('@/lib/db/domain-connections', () => ({
  getDomainConnectionByNormalizedDomain: mockGetByDomain,
}));

import { isReservedRoutingHost, resolveActiveDomainRoute } from '@/lib/domains/routing';

beforeEach(() => {
  mockGetByDomain.mockReset();
});

describe('isReservedRoutingHost', () => {
  it('treats the Webpresa hosts, localhost, empty string, and Vercel preview hosts as reserved', () => {
    expect(isReservedRoutingHost('webpresa.com')).toBe(true);
    expect(isReservedRoutingHost('www.webpresa.com')).toBe(true);
    expect(isReservedRoutingHost('localhost')).toBe(true);
    expect(isReservedRoutingHost('')).toBe(true);
    expect(isReservedRoutingHost('webpresa-git-dev.vercel.app')).toBe(true);
  });

  it('does not treat a genuine customer domain as reserved', () => {
    expect(isReservedRoutingHost('coastalplumbing.com')).toBe(false);
  });
});

describe('resolveActiveDomainRoute', () => {
  it('never queries the database for a reserved host', async () => {
    const result = await resolveActiveDomainRoute('webpresa.com');
    expect(result).toBeNull();
    expect(mockGetByDomain).not.toHaveBeenCalled();
  });

  it('returns null for an unknown host — fails closed, never falls through', async () => {
    mockGetByDomain.mockResolvedValueOnce(null);
    const result = await resolveActiveDomainRoute('unknown-domain.com');
    expect(result).toBeNull();
  });

  it('returns null for a known but not-yet-active domain', async () => {
    mockGetByDomain.mockResolvedValueOnce({ businessId: 'biz_1', slug: 'coastal', primaryHostname: 'coastalplumbing.com', status: 'awaiting_dns' });
    const result = await resolveActiveDomainRoute('coastalplumbing.com');
    expect(result).toBeNull();
  });

  it('resolves an active domain to its business/slug', async () => {
    mockGetByDomain.mockResolvedValueOnce({ businessId: 'biz_1', slug: 'coastal', primaryHostname: 'coastalplumbing.com', status: 'active' });
    const result = await resolveActiveDomainRoute('coastalplumbing.com');
    expect(result).toEqual({ businessId: 'biz_1', slug: 'coastal', primaryHostname: 'coastalplumbing.com' });
  });

  it('normalizes a www. prefix before looking up the apex record', async () => {
    mockGetByDomain.mockResolvedValueOnce({ businessId: 'biz_1', slug: 'coastal', primaryHostname: 'coastalplumbing.com', status: 'active' });
    await resolveActiveDomainRoute('www.coastalplumbing.com');
    expect(mockGetByDomain).toHaveBeenCalledWith('coastalplumbing.com');
  });
});
