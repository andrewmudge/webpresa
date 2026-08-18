/**
 * Unit tests for overridePostcardTemplateAction/clearPostcardTemplateOverrideAction
 * (Stage 26) — mirrors business-details-actions.test.ts's mocking shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetBusinessById, mockPutBusiness, mockUpdateBusiness, mockGetSession } = vi.hoisted(() => ({
  mockGetBusinessById: vi.fn(),
  mockPutBusiness: vi.fn(),
  mockUpdateBusiness: vi.fn(),
  mockGetSession: vi.fn(),
}));

vi.mock('@/lib/db/businesses', () => ({
  getBusinessById: mockGetBusinessById,
  putBusiness: mockPutBusiness,
  updateBusiness: mockUpdateBusiness,
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: mockGetSession,
}));

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { overridePostcardTemplateAction, clearPostcardTemplateOverrideAction } from '../postcard-template-actions';
import type { Business } from '@/domain/models/business';

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

const EXISTING_BUSINESS: Business = {
  businessId: 'biz_00000000-0000-0000-0000-000000000001',
  slug: 'acme-plumbing',
  name: 'Acme Plumbing',
  industry: 'plumbing',
  source: 'manual',
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const REDIRECT_TO = `/admin/businesses/${EXISTING_BUSINESS.businessId}`;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ sub: 'admin', expiresAt: new Date().toISOString() });
  mockGetBusinessById.mockResolvedValue(EXISTING_BUSINESS);
  mockPutBusiness.mockResolvedValue(undefined);
  mockUpdateBusiness.mockResolvedValue(undefined);
});

describe('overridePostcardTemplateAction', () => {
  it('requires an authenticated session', async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(
      overridePostcardTemplateAction(EXISTING_BUSINESS.businessId, REDIRECT_TO, makeFormData({ adminPostcardTemplateOverride: 'no_website' })),
    ).rejects.toThrow('Unauthorized');
    expect(mockUpdateBusiness).not.toHaveBeenCalled();
  });

  it('returns an error when the business does not exist', async () => {
    mockGetBusinessById.mockResolvedValue(null);
    await expect(
      overridePostcardTemplateAction('biz_notfound', REDIRECT_TO, makeFormData({ adminPostcardTemplateOverride: 'no_website' })),
    ).rejects.toThrow('Business not found');
  });

  it('saves a valid override and redirects', async () => {
    await expect(
      overridePostcardTemplateAction(EXISTING_BUSINESS.businessId, REDIRECT_TO, makeFormData({ adminPostcardTemplateOverride: 'no_website' })),
    ).rejects.toThrow(`REDIRECT:${REDIRECT_TO}?postcardTemplateOverride=saved`);

    expect(mockUpdateBusiness).toHaveBeenCalledWith(EXISTING_BUSINESS.businessId, { adminPostcardTemplateOverride: 'no_website' });
  });

  it('rejects an invalid template value without persisting', async () => {
    await expect(
      overridePostcardTemplateAction(EXISTING_BUSINESS.businessId, REDIRECT_TO, makeFormData({ adminPostcardTemplateOverride: 'bogus' })),
    ).rejects.toThrow(`REDIRECT:${REDIRECT_TO}?postcardTemplateOverride=invalid`);

    expect(mockUpdateBusiness).not.toHaveBeenCalled();
  });
});

describe('clearPostcardTemplateOverrideAction', () => {
  it('requires an authenticated session', async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(clearPostcardTemplateOverrideAction(EXISTING_BUSINESS.businessId, REDIRECT_TO)).rejects.toThrow('Unauthorized');
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('clears the override field only, leaving other fields untouched', async () => {
    mockGetBusinessById.mockResolvedValue({ ...EXISTING_BUSINESS, websiteUrl: 'https://example.com', adminPostcardTemplateOverride: 'no_website' });

    await expect(clearPostcardTemplateOverrideAction(EXISTING_BUSINESS.businessId, REDIRECT_TO)).rejects.toThrow(
      `REDIRECT:${REDIRECT_TO}?postcardTemplateOverride=cleared`,
    );

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.adminPostcardTemplateOverride).toBeUndefined();
    expect(saved.websiteUrl).toBe('https://example.com');
  });
});
