/**
 * Unit tests for approveScanImageAction — promoting a Firecrawl-discovered
 * scan image into the canonical Business photo library. All DynamoDB/S3/auth
 * interactions are mocked — no real network or AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Business } from '@/domain/models/business';
import type { ScanEvent } from '@/domain/models/scan-event';

const {
  mockGetSession,
  mockGetBusinessById,
  mockPutBusiness,
  mockUpdateBusiness,
  mockGetScanEventById,
  mockPutScanEvent,
  mockGetAsset,
  mockPutAsset,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetBusinessById: vi.fn(),
  mockPutBusiness: vi.fn(),
  mockUpdateBusiness: vi.fn(),
  mockGetScanEventById: vi.fn(),
  mockPutScanEvent: vi.fn(),
  mockGetAsset: vi.fn(),
  mockPutAsset: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/lib/db/businesses', () => ({
  getBusinessById: mockGetBusinessById,
  putBusiness: mockPutBusiness,
  updateBusiness: mockUpdateBusiness,
}));
vi.mock('@/lib/db/scan-events', () => ({ getScanEventById: mockGetScanEventById, putScanEvent: mockPutScanEvent }));
vi.mock('@/lib/s3/assets', () => ({ getAsset: mockGetAsset, putAsset: mockPutAsset }));
vi.mock('@/lib/firecrawl/enrich-business', () => ({ enrichBusinessWebsite: vi.fn(), retryEnrichmentScan: vi.fn() }));

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import {
  approveScanImageAction,
  approveScanImagesAction,
  applyFoundContactFieldAction,
} from '@/app/admin/(dashboard)/businesses/[businessId]/enrichment-actions';

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_1',
    slug: 'acme',
    name: 'Acme',
    industry: 'plumbing',
    source: 'manual',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeScan(overrides: Partial<ScanEvent> = {}): ScanEvent {
  return {
    scanId: 'scan_1',
    businessId: 'biz_1',
    provider: 'firecrawl',
    operation: 'scrape',
    status: 'completed',
    attempt: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ sub: 'admin' });
  mockPutBusiness.mockResolvedValue(undefined);
  mockUpdateBusiness.mockResolvedValue(undefined);
  mockPutScanEvent.mockResolvedValue(undefined);
  mockPutAsset.mockResolvedValue(undefined);
  mockGetAsset.mockResolvedValue(Buffer.from('fake-bytes'));
});

function formDataWith(images: string[]): FormData {
  const fd = new FormData();
  for (const value of images) fd.append('images', value);
  return fd;
}

describe('approveScanImageAction', () => {
  it('copies the scan image into businesses/{id}/assets/photos/ and appends it to Business.photoUrls', async () => {
    const business = makeBusiness({ photoUrls: ['/api/assets/businesses/biz_1/assets/photos/0.jpg'] });
    const scan = makeScan({
      images: [
        {
          imageId: 'img_1',
          url: '/api/assets/scans/biz_1/scan_1/images/img_1.jpg',
          s3Key: 'scans/biz_1/scan_1/images/img_1.jpg',
          role: 'hero',
          status: 'accepted',
          contentType: 'image/jpeg',
          originalUrl: 'https://example.com/hero.jpg',
        },
      ],
    });
    mockGetBusinessById.mockResolvedValue(business);
    mockGetScanEventById.mockResolvedValue(scan);
    mockGetAsset.mockResolvedValue(Buffer.from('fake-bytes'));

    await expect(
      approveScanImageAction('biz_1', 'scan_1', 'img_1', '/admin/businesses/biz_1'),
    ).rejects.toThrow('REDIRECT:/admin/businesses/biz_1?photoApproval=added');

    // The new photo's S3 key is randomized (never positional — see
    // appendBusinessPhotos in lib/s3/business-assets.ts), so pull the
    // actual generated key/URL out of the mock call rather than hardcoding it.
    expect(mockPutAsset).toHaveBeenCalledWith(
      expect.stringMatching(/^businesses\/biz_1\/assets\/photos\/[^/]+\.jpg$/),
      expect.any(Buffer),
      'image/jpeg',
    );
    const promotedKey = mockPutAsset.mock.calls[0][0] as string;
    const promotedUrl = `/api/assets/${promotedKey}`;

    expect(mockPutBusiness).toHaveBeenCalledWith(
      expect.objectContaining({
        photoUrls: ['/api/assets/businesses/biz_1/assets/photos/0.jpg', promotedUrl],
      }),
    );
    expect(mockPutScanEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        images: [expect.objectContaining({ imageId: 'img_1', promotedPhotoUrl: promotedUrl })],
      }),
    );
  });

  it('is idempotent — re-approving an already-promoted image does not duplicate it', async () => {
    const business = makeBusiness({ photoUrls: ['/api/assets/businesses/biz_1/assets/photos/0.jpg'] });
    const scan = makeScan({
      images: [
        {
          imageId: 'img_1',
          url: '/api/assets/scans/biz_1/scan_1/images/img_1.jpg',
          s3Key: 'scans/biz_1/scan_1/images/img_1.jpg',
          role: 'hero',
          status: 'accepted',
          originalUrl: 'https://example.com/hero.jpg',
          promotedPhotoUrl: '/api/assets/businesses/biz_1/assets/photos/0.jpg',
        },
      ],
    });
    mockGetBusinessById.mockResolvedValue(business);
    mockGetScanEventById.mockResolvedValue(scan);

    await expect(
      approveScanImageAction('biz_1', 'scan_1', 'img_1', '/admin/businesses/biz_1'),
    ).rejects.toThrow('REDIRECT:/admin/businesses/biz_1?photoApproval=already_added');

    expect(mockPutBusiness).not.toHaveBeenCalled();
    expect(mockPutAsset).not.toHaveBeenCalled();
  });

  it('refuses to promote once the business already has 6 photos', async () => {
    const business = makeBusiness({
      photoUrls: Array.from({ length: 6 }, (_, i) => `/api/assets/businesses/biz_1/assets/photos/${i}.jpg`),
    });
    const scan = makeScan({
      images: [
        {
          imageId: 'img_1',
          url: '/api/assets/scans/biz_1/scan_1/images/img_1.jpg',
          s3Key: 'scans/biz_1/scan_1/images/img_1.jpg',
          role: 'hero',
          status: 'accepted',
          originalUrl: 'https://example.com/hero.jpg',
        },
      ],
    });
    mockGetBusinessById.mockResolvedValue(business);
    mockGetScanEventById.mockResolvedValue(scan);

    await expect(
      approveScanImageAction('biz_1', 'scan_1', 'img_1', '/admin/businesses/biz_1'),
    ).rejects.toThrow('REDIRECT:/admin/businesses/biz_1?photoApproval=limit_reached');

    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('refuses to promote a rejected (never-stored) image', async () => {
    const business = makeBusiness();
    const scan = makeScan({
      images: [
        { imageId: 'img_1', role: 'unknown', status: 'rejected', originalUrl: 'https://example.com/tiny.jpg' },
      ],
    });
    mockGetBusinessById.mockResolvedValue(business);
    mockGetScanEventById.mockResolvedValue(scan);

    await expect(
      approveScanImageAction('biz_1', 'scan_1', 'img_1', '/admin/businesses/biz_1'),
    ).rejects.toThrow('REDIRECT:/admin/businesses/biz_1?photoApproval=not_found');

    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('requires an authenticated session', async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(approveScanImageAction('biz_1', 'scan_1', 'img_1', '/admin/businesses/biz_1')).rejects.toThrow('Unauthorized');
    expect(mockGetBusinessById).not.toHaveBeenCalled();
  });
});

describe('approveScanImagesAction (batch)', () => {
  it('promotes every selected image sequentially, growing photoUrls correctly across calls', async () => {
    const scan = makeScan({
      images: [
        { imageId: 'img_1', url: '/api/assets/scans/biz_1/scan_1/images/img_1.jpg', s3Key: 'scans/biz_1/scan_1/images/img_1.jpg', role: 'hero', status: 'accepted', contentType: 'image/jpeg', originalUrl: 'https://example.com/1.jpg' },
        { imageId: 'img_2', url: '/api/assets/scans/biz_1/scan_1/images/img_2.jpg', s3Key: 'scans/biz_1/scan_1/images/img_2.jpg', role: 'gallery', status: 'review_required', contentType: 'image/jpeg', originalUrl: 'https://example.com/2.jpg' },
      ],
    });
    // getBusinessById is re-fetched on every promoteScanImage call — return
    // whatever photoUrls putBusiness was most recently called with, so the
    // mock behaves like a real read-after-write sequence.
    let currentPhotoUrls: string[] = [];
    mockGetBusinessById.mockImplementation(async () => makeBusiness({ photoUrls: currentPhotoUrls }));
    mockPutBusiness.mockImplementation(async (b: Business) => {
      currentPhotoUrls = b.photoUrls ?? [];
    });
    mockGetScanEventById.mockResolvedValue(scan);

    await expect(
      approveScanImagesAction('biz_1', '/admin/businesses/biz_1', formDataWith(['scan_1::img_1', 'scan_1::img_2'])),
    ).rejects.toThrow('REDIRECT:/admin/businesses/biz_1?photoApproval=batch_added&added=2&skipped=0');

    // Keys are randomized (never positional), so assert growth/uniqueness
    // rather than exact key values — see appendBusinessPhotos.
    expect(currentPhotoUrls).toHaveLength(2);
    expect(new Set(currentPhotoUrls).size).toBe(2);
    for (const url of currentPhotoUrls) {
      expect(url).toMatch(/^\/api\/assets\/businesses\/biz_1\/assets\/photos\/[^/]+\.jpg$/);
    }
  });

  it('counts an already-promoted or over-limit image as skipped rather than failing the whole batch', async () => {
    const business = makeBusiness({ photoUrls: ['/api/assets/businesses/biz_1/assets/photos/0.jpg'] });
    const scan = makeScan({
      images: [
        {
          imageId: 'img_1',
          url: '/api/assets/scans/biz_1/scan_1/images/img_1.jpg',
          s3Key: 'scans/biz_1/scan_1/images/img_1.jpg',
          role: 'hero',
          status: 'accepted',
          originalUrl: 'https://example.com/1.jpg',
          promotedPhotoUrl: '/api/assets/businesses/biz_1/assets/photos/0.jpg',
        },
        {
          imageId: 'img_2',
          url: '/api/assets/scans/biz_1/scan_1/images/img_2.jpg',
          s3Key: 'scans/biz_1/scan_1/images/img_2.jpg',
          role: 'gallery',
          status: 'accepted',
          contentType: 'image/jpeg',
          originalUrl: 'https://example.com/2.jpg',
        },
      ],
    });
    mockGetBusinessById.mockResolvedValue(business);
    mockGetScanEventById.mockResolvedValue(scan);

    await expect(
      approveScanImagesAction('biz_1', '/admin/businesses/biz_1', formDataWith(['scan_1::img_1', 'scan_1::img_2'])),
    ).rejects.toThrow('REDIRECT:/admin/businesses/biz_1?photoApproval=batch_added&added=1&skipped=1');
  });

  it('redirects with none_selected when nothing was checked', async () => {
    await expect(
      approveScanImagesAction('biz_1', '/admin/businesses/biz_1', formDataWith([])),
    ).rejects.toThrow('REDIRECT:/admin/businesses/biz_1?photoApproval=none_selected');
    expect(mockGetBusinessById).not.toHaveBeenCalled();
  });

  it('requires an authenticated session', async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(
      approveScanImagesAction('biz_1', '/admin/businesses/biz_1', formDataWith(['scan_1::img_1'])),
    ).rejects.toThrow('Unauthorized');
    expect(mockGetBusinessById).not.toHaveBeenCalled();
  });
});

describe('applyFoundContactFieldAction', () => {
  it('applies a found email onto Business.email', async () => {
    await expect(
      applyFoundContactFieldAction('biz_1', 'email', 'aaa1paulsplumbing@yahoo.com', '/admin/businesses/biz_1'),
    ).rejects.toThrow('REDIRECT:/admin/businesses/biz_1?contactApproval=email');

    expect(mockUpdateBusiness).toHaveBeenCalledWith('biz_1', { email: 'aaa1paulsplumbing@yahoo.com' });
  });

  it('trims the applied value', async () => {
    await expect(
      applyFoundContactFieldAction('biz_1', 'phone', '  512-555-0100  ', '/admin/businesses/biz_1'),
    ).rejects.toThrow('REDIRECT:/admin/businesses/biz_1?contactApproval=phone');
    expect(mockUpdateBusiness).toHaveBeenCalledWith('biz_1', { phone: '512-555-0100' });
  });

  it('rejects an empty value without calling updateBusiness', async () => {
    await expect(
      applyFoundContactFieldAction('biz_1', 'email', '   ', '/admin/businesses/biz_1'),
    ).rejects.toThrow('REDIRECT:/admin/businesses/biz_1?contactApproval=not_found');
    expect(mockUpdateBusiness).not.toHaveBeenCalled();
  });

  it('requires an authenticated session', async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(
      applyFoundContactFieldAction('biz_1', 'email', 'found@acme.com', '/admin/businesses/biz_1'),
    ).rejects.toThrow('Unauthorized');
    expect(mockUpdateBusiness).not.toHaveBeenCalled();
  });
});
