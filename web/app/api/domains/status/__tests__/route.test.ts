/**
 * Unit tests for the domain-status reconciliation Route Handler.
 * All session/DB/domain-reconciliation calls are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetCustomerSession = vi.hoisted(() => vi.fn());
const mockGetBusinessById = vi.hoisted(() => vi.fn());
const mockListDomainConnectionsForBusiness = vi.hoisted(() => vi.fn());
const mockReconcileDomainConnection = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/customer-session', () => ({ getCustomerSession: mockGetCustomerSession }));
vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById }));
vi.mock('@/lib/db/domain-connections', () => ({ listDomainConnectionsForBusiness: mockListDomainConnectionsForBusiness }));
vi.mock('@/lib/domains/reconcile', () => ({ reconcileDomainConnection: mockReconcileDomainConnection }));

import { POST } from '@/app/api/domains/status/route';

function makeRequest(body: unknown, originHeader?: string | null): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (originHeader) headers.origin = originHeader;
  return new NextRequest('http://localhost/api/domains/status', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/domains/status', () => {
  it('Stage 25 — rejects a request with no Origin header at all, before touching session/DB', async () => {
    const res = await POST(
      makeRequest({ businessId: 'biz_1', normalizedDomain: 'example.com' }, null),
    );
    expect(res.status).toBe(403);
    expect(mockGetCustomerSession).not.toHaveBeenCalled();
  });

  it('rejects a request whose Origin does not match the request origin', async () => {
    const res = await POST(
      makeRequest({ businessId: 'biz_1', normalizedDomain: 'example.com' }, 'https://evil.example'),
    );
    expect(res.status).toBe(403);
    expect(mockGetCustomerSession).not.toHaveBeenCalled();
  });

  it('accepts a matching same-origin request and proceeds to authentication', async () => {
    mockGetCustomerSession.mockResolvedValueOnce(null);
    const res = await POST(
      makeRequest({ businessId: 'biz_1', normalizedDomain: 'example.com' }, 'http://localhost'),
    );
    expect(res.status).toBe(401);
    expect(mockGetCustomerSession).toHaveBeenCalled();
  });

  it('never trusts the client-supplied businessId/domain pairing', async () => {
    mockGetCustomerSession.mockResolvedValueOnce({ sub: 'user_1' });
    mockGetBusinessById.mockResolvedValueOnce({ businessId: 'biz_1', ownerUserId: 'user_1' });
    mockListDomainConnectionsForBusiness.mockResolvedValueOnce([{ normalizedDomain: 'other.com' }]);

    const res = await POST(
      makeRequest({ businessId: 'biz_1', normalizedDomain: 'not-actually-owned.com' }, 'http://localhost'),
    );

    expect(res.status).toBe(404);
    expect(mockReconcileDomainConnection).not.toHaveBeenCalled();
  });
});
