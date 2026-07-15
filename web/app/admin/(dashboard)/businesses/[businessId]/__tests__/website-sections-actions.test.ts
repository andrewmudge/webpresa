/**
 * Unit tests for the website-section admin server actions
 * (saveWebsiteSectionsAction, applyRecommendedSectionsAction,
 * resetWebsiteSectionsAction). All DynamoDB interactions and auth are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetBusinessById, mockUpdateBusiness, mockListPreviewsForBusiness, mockGetSession } = vi.hoisted(() => ({
  mockGetBusinessById: vi.fn(),
  mockUpdateBusiness: vi.fn(),
  mockListPreviewsForBusiness: vi.fn(),
  mockGetSession: vi.fn(),
}));

vi.mock('@/lib/db/businesses', () => ({
  getBusinessById: mockGetBusinessById,
  updateBusiness: mockUpdateBusiness,
  putBusiness: vi.fn(),
}));

vi.mock('@/lib/s3/business-assets', () => ({
  uploadBusinessAssets: vi.fn(),
}));

vi.mock('@/lib/db/site-previews', () => ({
  listPreviewsForBusiness: mockListPreviewsForBusiness,
  getSitePreviewById: vi.fn(),
  putSitePreview: vi.fn(),
}));

vi.mock('@/lib/db/scan-events', () => ({
  listScansForBusiness: vi.fn(),
  deleteScanEventById: vi.fn(),
}));

vi.mock('@/lib/db/postcards', () => ({
  listPostcardsForBusiness: vi.fn(),
  deletePostcardById: vi.fn(),
}));

// actions.ts unconditionally imports these at module scope for the other
// (unrelated) actions in the same file — they pull in `server-only`-guarded
// singletons that throw outside a real Next.js server context, so they must
// be mocked here even though this file's tests never exercise them.
vi.mock('@/lib/ai/generate-preview', () => ({
  generatePreviewContent: vi.fn(),
}));

vi.mock('@/lib/theme/select-theme', () => ({
  resolveBusinessThemeForSeed: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: mockGetSession,
}));

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import {
  saveWebsiteSectionsAction,
  applyRecommendedSectionsAction,
  resetWebsiteSectionsAction,
} from '@/app/admin/(dashboard)/businesses/[businessId]/actions';
import { WEBSITE_SECTION_TYPES, REQUIRED_SECTION_TYPES } from '@/domain/constants/website-sections';
import { createDefaultWebsiteSectionsConfig } from '@/domain/factories/website-sections.factory';
import type { Business } from '@/domain/models/business';
import type { WebsiteSectionsConfig } from '@/domain/models/website-sections';

const EXISTING_BUSINESS: Business = {
  businessId: 'biz_00000000-0000-0000-0000-000000000001',
  slug: 'acme-plumbing',
  name: 'Acme Plumbing',
  industry: 'plumbing',
  source: 'manual',
  status: 'pending',
  phone: '512-555-0100',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function fullFormData(overrides: { enabled?: string[]; order?: Record<string, string> } = {}): FormData {
  const fd = new FormData();
  const defaults = createDefaultWebsiteSectionsConfig();
  const enabled = new Set(overrides.enabled ?? defaults.sections.filter((s) => s.enabled).map((s) => s.component));
  for (const type of WEBSITE_SECTION_TYPES) {
    if (enabled.has(type)) fd.append(`enabled_${type}`, 'on');
    const order = overrides.order?.[type] ?? String(defaults.sections.find((s) => s.component === type)!.order);
    fd.append(`order_${type}`, order);
  }
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ sub: 'admin', expiresAt: new Date().toISOString() });
  mockGetBusinessById.mockResolvedValue(EXISTING_BUSINESS);
  mockUpdateBusiness.mockResolvedValue(EXISTING_BUSINESS);
  mockListPreviewsForBusiness.mockResolvedValue([]);
});

describe('saveWebsiteSectionsAction', () => {
  it('requires an authenticated session', async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await saveWebsiteSectionsAction(EXISTING_BUSINESS.businessId, undefined, fullFormData());
    expect(result?.message).toBe('Unauthorized');
    expect(mockUpdateBusiness).not.toHaveBeenCalled();
  });

  it('persists a valid configuration and redirects', async () => {
    await expect(saveWebsiteSectionsAction(EXISTING_BUSINESS.businessId, undefined, fullFormData())).rejects.toThrow(
      `REDIRECT:/admin/businesses/${EXISTING_BUSINESS.businessId}`,
    );
    expect(mockUpdateBusiness).toHaveBeenCalledTimes(1);
    const [, updates] = mockUpdateBusiness.mock.calls[0];
    const saved = updates.websiteSections as WebsiteSectionsConfig;
    expect(saved.sections).toHaveLength(WEBSITE_SECTION_TYPES.length);
  });

  it('force-enables required sections even when their checkbox is omitted from the submission', async () => {
    const fd = fullFormData({ enabled: [] }); // no checkboxes checked at all
    await expect(saveWebsiteSectionsAction(EXISTING_BUSINESS.businessId, undefined, fd)).rejects.toThrow('REDIRECT:');
    const [, updates] = mockUpdateBusiness.mock.calls[0];
    const saved = updates.websiteSections as WebsiteSectionsConfig;
    for (const required of REQUIRED_SECTION_TYPES) {
      expect(saved.sections.find((s) => s.component === required)?.enabled).toBe(true);
    }
    // A non-required section with no checkbox present is correctly disabled.
    expect(saved.sections.find((s) => s.component === 'trustStrip')?.enabled).toBe(false);
  });

  it('rejects an invalid order value via schema validation and does not persist', async () => {
    const fd = fullFormData({ order: { hero: '-5' } });
    const result = await saveWebsiteSectionsAction(EXISTING_BUSINESS.businessId, undefined, fd);
    expect(result?.message).toBeTruthy();
    expect(mockUpdateBusiness).not.toHaveBeenCalled();
  });

  it('returns an error when the business does not exist', async () => {
    mockGetBusinessById.mockResolvedValue(null);
    const result = await saveWebsiteSectionsAction(EXISTING_BUSINESS.businessId, undefined, fullFormData());
    expect(result?.message).toBe('Business not found');
  });
});

describe('applyRecommendedSectionsAction', () => {
  it('computes a recommendation from business data and persists it', async () => {
    await expect(applyRecommendedSectionsAction(EXISTING_BUSINESS.businessId)).rejects.toThrow(
      `REDIRECT:/admin/businesses/${EXISTING_BUSINESS.businessId}`,
    );
    expect(mockUpdateBusiness).toHaveBeenCalledTimes(1);
    const [, updates] = mockUpdateBusiness.mock.calls[0];
    const saved = updates.websiteSections as WebsiteSectionsConfig;
    // Business has a phone number — CTA banner should be recommended enabled.
    expect(saved.sections.find((s) => s.component === 'ctaBanner')?.enabled).toBe(true);
    // No review data — reviews should not be recommended enabled.
    expect(saved.sections.find((s) => s.component === 'reviews')?.enabled).toBe(false);
  });

  it('requires an authenticated session', async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(applyRecommendedSectionsAction(EXISTING_BUSINESS.businessId)).rejects.toThrow('Unauthorized');
    expect(mockUpdateBusiness).not.toHaveBeenCalled();
  });
});

describe('resetWebsiteSectionsAction', () => {
  it('persists the catalog default configuration and redirects', async () => {
    await expect(resetWebsiteSectionsAction(EXISTING_BUSINESS.businessId)).rejects.toThrow(
      `REDIRECT:/admin/businesses/${EXISTING_BUSINESS.businessId}`,
    );
    const [, updates] = mockUpdateBusiness.mock.calls[0];
    expect(updates.websiteSections).toEqual(createDefaultWebsiteSectionsConfig());
  });
});
