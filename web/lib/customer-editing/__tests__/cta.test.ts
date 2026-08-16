/**
 * Unit tests for `updateCustomerCta` — the "Call-to-action buttons" editor
 * on the customer website's Contact tab. Focused on the secondary-CTA
 * hide/show bug: `resolvePreviewCtaConfig` (app/b/[slug]/template/cta.tsx)
 * falls back to a site-wide default secondary CTA whenever `secondary` is
 * `undefined`, so unchecking "Show a secondary button" must save an
 * explicit `{ type: 'none' }`, not just omit the field.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockUpdateBusiness, mockEnsureDraftPreview, mockPutSitePreview } = vi.hoisted(() => ({
  mockUpdateBusiness: vi.fn(),
  mockEnsureDraftPreview: vi.fn(),
  mockPutSitePreview: vi.fn(),
}));

vi.mock('@/lib/db/businesses', () => ({
  updateBusiness: mockUpdateBusiness,
}));

vi.mock('@/lib/db/site-previews', () => ({
  ensureDraftPreview: mockEnsureDraftPreview,
  putSitePreview: mockPutSitePreview,
}));

import { updateCustomerCta } from '@/lib/customer-editing/cta';

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

function makeDraft() {
  return {
    previewId: 'preview_draft',
    businessId: 'biz_1',
    status: 'draft',
    content: {
      hero: { headline: 'h', subheadline: 's', ctaText: 'Call' },
      services: [{ name: 'Service', description: 'Description' }],
      tagline: 't',
      aboutText: 'a',
      contact: {},
    },
    theme: { fontFamily: 'sans-serif' },
  };
}

beforeEach(() => {
  mockUpdateBusiness.mockReset();
  mockEnsureDraftPreview.mockReset();
  mockPutSitePreview.mockReset();
});

describe('updateCustomerCta', () => {
  it('saves an explicit hidden secondary ({ type: "none" }) when the checkbox is unchecked, not undefined', async () => {
    mockEnsureDraftPreview.mockResolvedValueOnce(makeDraft());

    const result = await updateCustomerCta(
      'biz_1',
      formData({ primaryType: 'phone', primaryLabel: 'Call Now' }),
    );

    expect(result).toBeUndefined();
    const savedPreview = mockPutSitePreview.mock.calls[0][0];
    // Must be an explicit `type: 'none'`, never omitted — an omitted
    // `secondary` falls back to the site-wide default "Request Service"
    // button at render time, which is exactly the bug being fixed here.
    expect(savedPreview.content.cta.secondary).toEqual({ type: 'none', label: '' });
    expect(savedPreview.content.cta).toHaveProperty('secondary');

    const savedBusiness = mockUpdateBusiness.mock.calls[0][1];
    expect(savedBusiness.cta.secondary).toEqual({ type: 'none', label: '' });
  });

  it('saves the configured secondary CTA when the checkbox is checked', async () => {
    mockEnsureDraftPreview.mockResolvedValueOnce(makeDraft());

    const result = await updateCustomerCta(
      'biz_1',
      formData({
        primaryType: 'phone',
        primaryLabel: 'Call Now',
        secondaryEnabled: 'on',
        secondaryType: 'email',
        secondaryLabel: 'Email Us',
      }),
    );

    expect(result).toBeUndefined();
    const savedPreview = mockPutSitePreview.mock.calls[0][0];
    expect(savedPreview.content.cta.secondary).toEqual({ type: 'email', label: 'Email Us' });
  });

  it('rejects a checked secondary with no action type selected', async () => {
    const result = await updateCustomerCta(
      'biz_1',
      formData({ primaryType: 'phone', primaryLabel: 'Call Now', secondaryEnabled: 'on' }),
    );

    expect(result?.errors?.secondaryType).toBeTruthy();
    expect(mockEnsureDraftPreview).not.toHaveBeenCalled();
  });

  it('rejects a blank primary label', async () => {
    const result = await updateCustomerCta('biz_1', formData({ primaryType: 'phone', primaryLabel: '' }));
    expect(result?.errors?.primaryLabel).toBeTruthy();
    expect(mockEnsureDraftPreview).not.toHaveBeenCalled();
  });
});
