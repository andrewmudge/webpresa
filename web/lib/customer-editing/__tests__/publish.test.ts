/**
 * Unit tests for `publishCustomerDraft` — the customer publish primitive
 * (implementation.md, Stage 19). Security-critical: must re-verify that
 * `previewId` actually belongs to `businessId` server-side, never trusting
 * a browser-supplied pairing, before calling the shared `publishSitePreview`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockGetSitePreviewById, mockPublishSitePreview, mockUpdateBusiness } = vi.hoisted(() => ({
  mockGetSitePreviewById: vi.fn(),
  mockPublishSitePreview: vi.fn(),
  mockUpdateBusiness: vi.fn(),
}));

vi.mock('@/lib/db/site-previews', () => ({
  getSitePreviewById: mockGetSitePreviewById,
  publishSitePreview: mockPublishSitePreview,
}));

vi.mock('@/lib/db/businesses', () => ({
  updateBusiness: mockUpdateBusiness,
}));

import { publishCustomerDraft } from '@/lib/customer-editing/publish';

beforeEach(() => {
  mockGetSitePreviewById.mockReset();
  mockPublishSitePreview.mockReset();
  mockUpdateBusiness.mockReset();
});

describe('publishCustomerDraft', () => {
  it('rejects when the preview does not exist, without calling publishSitePreview', async () => {
    mockGetSitePreviewById.mockResolvedValueOnce(null);
    const result = await publishCustomerDraft('biz_1', 'preview_ghost');
    expect(result?.message).toMatch(/not found/i);
    expect(mockPublishSitePreview).not.toHaveBeenCalled();
  });

  it('rejects a preview that belongs to a different business — never trusts the browser-supplied pairing', async () => {
    mockGetSitePreviewById.mockResolvedValueOnce({ previewId: 'preview_1', businessId: 'biz_someone_else' });
    const result = await publishCustomerDraft('biz_1', 'preview_1');
    expect(result?.message).toMatch(/not found/i);
    expect(mockPublishSitePreview).not.toHaveBeenCalled();
  });

  it('publishes and updates currentPreviewId when the pairing is valid', async () => {
    mockGetSitePreviewById.mockResolvedValueOnce({ previewId: 'preview_1', businessId: 'biz_1' });
    mockPublishSitePreview.mockResolvedValueOnce({ previewId: 'preview_1', businessId: 'biz_1', status: 'published' });

    const result = await publishCustomerDraft('biz_1', 'preview_1');

    expect(result).toBeUndefined();
    expect(mockPublishSitePreview).toHaveBeenCalledWith('preview_1');
    expect(mockUpdateBusiness).toHaveBeenCalledWith('biz_1', { currentPreviewId: 'preview_1' });
  });
});
