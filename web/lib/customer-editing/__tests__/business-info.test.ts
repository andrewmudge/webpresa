/**
 * Unit tests for `updateCustomerBusinessInfo` (Settings page — the single
 * canonical edit surface for name/phone/email/address/social links, see
 * implementation.md, Stage 19, "Contact & CTAs vs. Settings").
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockGetBusinessById, mockPutBusiness, mockEnsureDraftPreview, mockPutSitePreview } = vi.hoisted(() => ({
  mockGetBusinessById: vi.fn(),
  mockPutBusiness: vi.fn(),
  mockEnsureDraftPreview: vi.fn(),
  mockPutSitePreview: vi.fn(),
}));

vi.mock('@/lib/db/businesses', () => ({
  getBusinessById: mockGetBusinessById,
  putBusiness: mockPutBusiness,
}));

vi.mock('@/lib/db/site-previews', () => ({
  ensureDraftPreview: mockEnsureDraftPreview,
  putSitePreview: mockPutSitePreview,
}));

import { updateCustomerBusinessInfo } from '@/lib/customer-editing/business-info';

function makeBusiness(overrides: Record<string, unknown> = {}) {
  return {
    businessId: 'biz_1',
    name: 'Old Name',
    address: { line1: '1 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
    ...overrides,
  };
}

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  mockGetBusinessById.mockReset();
  mockPutBusiness.mockReset();
  mockEnsureDraftPreview.mockReset();
  mockPutSitePreview.mockReset();
});

describe('updateCustomerBusinessInfo', () => {
  it('rejects a blank business name', async () => {
    const result = await updateCustomerBusinessInfo('biz_1', formData({ name: '' }));
    expect(result?.errors?.name).toBeTruthy();
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('rejects an invalid email', async () => {
    const result = await updateCustomerBusinessInfo('biz_1', formData({ name: 'Acme', email: 'not-an-email' }));
    expect(result?.errors?.email).toBeTruthy();
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('saves name/phone/email and dual-writes phone/email onto the draft preview\'s contact info', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness());
    mockEnsureDraftPreview.mockResolvedValueOnce({
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
    });

    const result = await updateCustomerBusinessInfo(
      'biz_1',
      formData({ name: 'Acme Plumbing', phone: '555-1234', email: 'hi@acme.test' }),
    );

    expect(result).toBeUndefined();
    expect(mockPutBusiness).toHaveBeenCalledTimes(1);
    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.name).toBe('Acme Plumbing');
    expect(saved.phone).toBe('555-1234');
    expect(saved.email).toBe('hi@acme.test');

    // The public site renders contact info from the preview's own
    // `content.contact`, never `Business.phone`/`email` directly — this
    // dual-write is what makes a Settings edit actually show up on the
    // live site once published.
    expect(mockEnsureDraftPreview).toHaveBeenCalledWith('biz_1');
    expect(mockPutSitePreview).toHaveBeenCalledTimes(1);
    const savedPreview = mockPutSitePreview.mock.calls[0][0];
    expect(savedPreview.content.contact).toEqual({ phone: '555-1234', email: 'hi@acme.test' });
  });

  it('dual-writes a newly submitted complete address onto the draft preview as a formatted string', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness());
    mockEnsureDraftPreview.mockResolvedValueOnce({
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
    });

    await updateCustomerBusinessInfo(
      'biz_1',
      formData({
        name: 'Acme',
        addressLine1: '601 West Main Street',
        addressCity: 'Frisco',
        addressState: 'CO',
        addressPostalCode: '80443',
      }),
    );

    const savedPreview = mockPutSitePreview.mock.calls[0][0];
    expect(savedPreview.content.contact.address).toBe('601 West Main Street, Frisco, CO 80443');
  });

  it('does not touch the preview when no phone/email/address/social links were submitted', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness());
    const result = await updateCustomerBusinessInfo('biz_1', formData({ name: 'Acme' }));
    expect(result).toBeUndefined();
    expect(mockEnsureDraftPreview).not.toHaveBeenCalled();
  });

  it('does not overwrite an existing address when address fields are left blank', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness());
    await updateCustomerBusinessInfo('biz_1', formData({ name: 'Acme' }));
    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.address).toEqual(makeBusiness().address);
  });

  it('dual-writes valid social links onto a draft preview via ensureDraftPreview, never patching the latest preview directly', async () => {
    mockGetBusinessById.mockResolvedValueOnce(makeBusiness());
    mockEnsureDraftPreview.mockResolvedValueOnce({
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
    });

    const result = await updateCustomerBusinessInfo(
      'biz_1',
      formData({ name: 'Acme', socialLinks: 'https://facebook.com/acme' }),
    );

    expect(result).toBeUndefined();
    expect(mockEnsureDraftPreview).toHaveBeenCalledWith('biz_1');
    expect(mockPutSitePreview).toHaveBeenCalledTimes(1);
    const savedPreview = mockPutSitePreview.mock.calls[0][0];
    expect(savedPreview.previewId).toBe('preview_draft');
    expect(savedPreview.content.socialLinks).toEqual([{ platform: 'facebook', url: 'https://facebook.com/acme' }]);
  });

  it('rejects social-links input that sanitizes down to zero valid URLs', async () => {
    const result = await updateCustomerBusinessInfo('biz_1', formData({ name: 'Acme', socialLinks: 'not a url at all!!' }));
    expect(result?.errors?.socialLinks).toBeTruthy();
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });
});
