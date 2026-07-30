/**
 * Unit tests for `persistWebsiteSections` — extracted (Stage 19) from the
 * admin business detail page's `actions.ts` into a shared, auth-agnostic
 * lib function so both the admin and customer-scoped Sections editors call
 * the identical validated write path. Existing behavior (full reconstruct,
 * force-enable required sections, strict validation) is unchanged by the
 * move — these tests pin that down at the new location.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockGetBusinessById, mockUpdateBusiness } = vi.hoisted(() => ({
  mockGetBusinessById: vi.fn(),
  mockUpdateBusiness: vi.fn(),
}));

vi.mock('@/lib/db/businesses', () => ({
  getBusinessById: mockGetBusinessById,
  updateBusiness: mockUpdateBusiness,
}));

import { persistWebsiteSections } from '@/lib/website-sections/persist';
import { WEBSITE_SECTION_TYPES, REQUIRED_SECTION_TYPES } from '@/domain/constants/website-sections';

function makeBusiness(overrides: Record<string, unknown> = {}) {
  return { businessId: 'biz_1', name: 'Acme', ...overrides };
}

function baseFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  WEBSITE_SECTION_TYPES.forEach((type, i) => {
    fd.set(`enabled_${type}`, 'on');
    fd.set(`order_${type}`, String((i + 1) * 10));
  });
  for (const [key, value] of Object.entries(overrides)) {
    fd.set(key, value);
  }
  return fd;
}

beforeEach(() => {
  mockGetBusinessById.mockReset();
  mockUpdateBusiness.mockReset();
});

describe('persistWebsiteSections', () => {
  it('returns an error when the business does not exist', async () => {
    mockGetBusinessById.mockResolvedValueOnce(null);
    const result = await persistWebsiteSections('biz_missing', baseFormData());
    expect(result?.message).toMatch(/not found/i);
    expect(mockUpdateBusiness).not.toHaveBeenCalled();
  });

  it('force-enables every required section regardless of what the form submitted', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness());
    const fd = baseFormData();
    // Try to disable every required section — should be overridden.
    for (const type of REQUIRED_SECTION_TYPES) {
      fd.delete(`enabled_${type}`);
    }

    const result = await persistWebsiteSections('biz_1', fd);
    expect(result).toBeUndefined();

    const saved = mockUpdateBusiness.mock.calls[0][1].websiteSections;
    for (const type of REQUIRED_SECTION_TYPES) {
      const entry = saved.sections.find((s: { component: string }) => s.component === type);
      expect(entry.enabled).toBe(true);
    }
  });

  it('respects a non-required section explicitly disabled', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness());
    const fd = baseFormData();
    fd.delete('enabled_gallery'); // gallery is not required

    await persistWebsiteSections('biz_1', fd);

    const saved = mockUpdateBusiness.mock.calls[0][1].websiteSections;
    const gallery = saved.sections.find((s: { component: string }) => s.component === 'gallery');
    expect(gallery.enabled).toBe(false);
  });

  it('saves the submitted order values', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness());
    const fd = baseFormData({ order_hero: '5' });

    await persistWebsiteSections('biz_1', fd);

    const saved = mockUpdateBusiness.mock.calls[0][1].websiteSections;
    const hero = saved.sections.find((s: { component: string }) => s.component === 'hero');
    expect(hero.order).toBe(5);
  });

  it('surfaces a DynamoDB write failure as a generic error, not a thrown exception', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness());
    mockUpdateBusiness.mockRejectedValueOnce(new Error('DynamoDB write failed'));

    const result = await persistWebsiteSections('biz_1', baseFormData());
    expect(result?.message).toMatch(/failed to save/i);
  });
});
