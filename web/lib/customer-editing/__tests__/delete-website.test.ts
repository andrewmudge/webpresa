/**
 * Unit tests for `deleteCustomerWebsite` (Settings, Danger Zone). Verifies
 * ownership re-check, the full cascade, and that Vercel/S3 failures never
 * block the DynamoDB delete (best-effort, matching
 * `lib/domains/disconnect.ts`'s existing precedent).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const {
  mockGetBusinessById,
  mockDeleteBusinessById,
  mockListPreviews,
  mockDeletePreview,
  mockListScans,
  mockDeleteScan,
  mockListPostcards,
  mockDeletePostcard,
  mockListClaims,
  mockDeleteClaim,
  mockListDomainConnections,
  mockDeleteDomainConnectionRecord,
  mockRemoveProjectDomain,
  mockDeleteAsset,
  mockAssetKeyFromUrl,
} = vi.hoisted(() => ({
  mockGetBusinessById: vi.fn(),
  mockDeleteBusinessById: vi.fn(),
  mockListPreviews: vi.fn(),
  mockDeletePreview: vi.fn(),
  mockListScans: vi.fn(),
  mockDeleteScan: vi.fn(),
  mockListPostcards: vi.fn(),
  mockDeletePostcard: vi.fn(),
  mockListClaims: vi.fn(),
  mockDeleteClaim: vi.fn(),
  mockListDomainConnections: vi.fn(),
  mockDeleteDomainConnectionRecord: vi.fn(),
  mockRemoveProjectDomain: vi.fn(),
  mockDeleteAsset: vi.fn(),
  mockAssetKeyFromUrl: vi.fn(),
}));

vi.mock('@/lib/db/businesses', () => ({
  getBusinessById: mockGetBusinessById,
  deleteBusinessById: mockDeleteBusinessById,
}));
vi.mock('@/lib/db/site-previews', () => ({
  listPreviewsForBusiness: mockListPreviews,
  deletePreviewById: mockDeletePreview,
}));
vi.mock('@/lib/db/scan-events', () => ({
  listScansForBusiness: mockListScans,
  deleteScanEventById: mockDeleteScan,
}));
vi.mock('@/lib/db/postcards', () => ({
  listPostcardsForBusiness: mockListPostcards,
  deletePostcardById: mockDeletePostcard,
}));
vi.mock('@/lib/db/claims', () => ({
  listClaimsForBusiness: mockListClaims,
  deleteClaimById: mockDeleteClaim,
}));
vi.mock('@/lib/db/domain-connections', () => ({
  listDomainConnectionsForBusiness: mockListDomainConnections,
  deleteDomainConnectionRecord: mockDeleteDomainConnectionRecord,
}));
vi.mock('@/lib/vercel/domains', () => ({
  removeProjectDomain: mockRemoveProjectDomain,
}));
vi.mock('@/lib/s3/assets', () => ({
  deleteAsset: mockDeleteAsset,
}));
vi.mock('@/lib/s3/business-assets', () => ({
  assetKeyFromUrl: mockAssetKeyFromUrl,
}));

import { deleteCustomerWebsite } from '@/lib/customer-editing/delete-website';

function makeBusiness(overrides: Record<string, unknown> = {}) {
  return {
    businessId: 'biz_1',
    ownerUserId: 'user_owner',
    name: 'Acme Plumbing',
    photoUrls: ['https://cdn.example.com/photo1.jpg', 'https://cdn.example.com/photo2.jpg'],
    logoUrl: 'https://cdn.example.com/logo.jpg',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListPreviews.mockResolvedValue([{ previewId: 'preview_1' }]);
  mockListScans.mockResolvedValue([{ scanId: 'scan_1' }]);
  mockListPostcards.mockResolvedValue([{ postcardId: 'postcard_1' }]);
  mockListClaims.mockResolvedValue([{ claimId: 'claim_1' }]);
  mockListDomainConnections.mockResolvedValue([]);
  mockAssetKeyFromUrl.mockImplementation((url: string) => `businesses/biz_1/assets/${url.split('/').pop()}`);
  mockDeleteAsset.mockResolvedValue(undefined);
  mockRemoveProjectDomain.mockResolvedValue(undefined);
});

describe('deleteCustomerWebsite', () => {
  it('rejects when the business does not exist', async () => {
    mockGetBusinessById.mockResolvedValue(null);
    const result = await deleteCustomerWebsite('biz_1', 'user_owner');
    expect(result?.message).toBeTruthy();
    expect(mockDeleteBusinessById).not.toHaveBeenCalled();
  });

  it('rejects when the caller does not own the business', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness({ ownerUserId: 'someone_else' }));
    const result = await deleteCustomerWebsite('biz_1', 'user_owner');
    expect(result?.message).toBeTruthy();
    expect(mockDeleteBusinessById).not.toHaveBeenCalled();
  });

  it('cascades previews, scans, postcards, claims, and photos, then deletes the business', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    const result = await deleteCustomerWebsite('biz_1', 'user_owner');

    expect(result).toBeUndefined();
    expect(mockDeletePreview).toHaveBeenCalledWith('preview_1');
    expect(mockDeleteScan).toHaveBeenCalledWith('scan_1');
    expect(mockDeletePostcard).toHaveBeenCalledWith('postcard_1');
    expect(mockDeleteClaim).toHaveBeenCalledWith('claim_1');
    expect(mockDeleteAsset).toHaveBeenCalledTimes(3); // 2 photos + 1 logo
    expect(mockDeleteBusinessById).toHaveBeenCalledWith('biz_1');
  });

  it('removes every domain connection (Vercel + DynamoDB) when one exists', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListDomainConnections.mockResolvedValue([
      { normalizedDomain: 'example.com', primaryHostname: 'example.com' },
    ]);

    await deleteCustomerWebsite('biz_1', 'user_owner');

    expect(mockRemoveProjectDomain).toHaveBeenCalledWith('example.com');
    expect(mockDeleteDomainConnectionRecord).toHaveBeenCalledWith('example.com');
    expect(mockDeleteBusinessById).toHaveBeenCalled();
  });

  it('still deletes the DynamoDB domain record and completes the cascade when Vercel removal fails', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockListDomainConnections.mockResolvedValue([
      { normalizedDomain: 'example.com', primaryHostname: 'example.com' },
    ]);
    mockRemoveProjectDomain.mockRejectedValue(new Error('Vercel unavailable'));

    const result = await deleteCustomerWebsite('biz_1', 'user_owner');

    expect(result).toBeUndefined();
    expect(mockDeleteDomainConnectionRecord).toHaveBeenCalledWith('example.com');
    expect(mockDeleteBusinessById).toHaveBeenCalled();
  });

  it('still completes the cascade when an S3 asset delete fails', async () => {
    mockGetBusinessById.mockResolvedValue(makeBusiness());
    mockDeleteAsset.mockRejectedValue(new Error('S3 unavailable'));

    const result = await deleteCustomerWebsite('biz_1', 'user_owner');

    expect(result).toBeUndefined();
    expect(mockDeleteBusinessById).toHaveBeenCalled();
  });
});
