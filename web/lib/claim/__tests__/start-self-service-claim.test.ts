/**
 * Unit tests for startSelfServiceClaim — issuing a real Claim record for a
 * self-service-built, unclaimed business. The critical case under test:
 * this must fail closed for anything that isn't genuinely a self-service,
 * unclaimed, already-published business — see the module's own doc comment
 * for exactly why (this endpoint would otherwise be a way to mint a
 * claim-intent cookie for ANY unclaimed business, postcard leads included).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Business } from '@/domain/models/business';

const { mockGetBusinessById, mockPutClaim, mockGenerateAndHashClaimToken } = vi.hoisted(() => ({
  mockGetBusinessById: vi.fn(),
  mockPutClaim: vi.fn(),
  mockGenerateAndHashClaimToken: vi.fn(),
}));

vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById }));
vi.mock('@/lib/db/claims', () => ({ putClaim: mockPutClaim }));
vi.mock('../token', () => ({ generateAndHashClaimToken: mockGenerateAndHashClaimToken }));
vi.mock('server-only', () => ({}));

import { startSelfServiceClaim } from '../start-self-service-claim';

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_1',
    slug: 'acme-plumbing',
    name: 'Acme Plumbing',
    industry: 'plumbing',
    source: 'self_service',
    status: 'pending',
    currentPreviewId: 'preview_1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGenerateAndHashClaimToken.mockResolvedValue({ rawToken: 'XXXX-XXXX-XXXX-XXXX', tokenHash: 'a'.repeat(64) });
});

describe('startSelfServiceClaim', () => {
  it('issues a claim for an eligible self-service, unclaimed, published business', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness());

    const result = await startSelfServiceClaim('biz_1');

    expect(result.status).toBe('issued');
    expect(mockPutClaim).toHaveBeenCalledTimes(1);
    const [claim] = mockPutClaim.mock.calls[0];
    expect(claim.businessId).toBe('biz_1');
    expect(claim.tokenHash).toBe('a'.repeat(64));
    expect(claim.previewId).toBe('preview_1');
  });

  it('fails closed for a non-self-service business — the load-bearing security check', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness({ source: 'google_places' }));

    const result = await startSelfServiceClaim('biz_1');

    expect(result.status).toBe('not_eligible');
    expect(mockPutClaim).not.toHaveBeenCalled();
  });

  it('fails closed for a self-service business that already has an owner', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness({ ownerUserId: 'sub_1' }));

    const result = await startSelfServiceClaim('biz_1');

    expect(result.status).toBe('not_eligible');
    expect(mockPutClaim).not.toHaveBeenCalled();
  });

  it('fails closed for a self-service business with no published preview yet', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness({ currentPreviewId: undefined }));

    const result = await startSelfServiceClaim('biz_1');

    expect(result.status).toBe('not_eligible');
    expect(mockPutClaim).not.toHaveBeenCalled();
  });

  it('fails closed for an unknown businessId', async () => {
    mockGetBusinessById.mockResolvedValueOnce(null);

    const result = await startSelfServiceClaim('biz_missing');

    expect(result.status).toBe('not_eligible');
    expect(mockPutClaim).not.toHaveBeenCalled();
  });
});
