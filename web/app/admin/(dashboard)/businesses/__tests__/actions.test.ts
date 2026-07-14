/**
 * Unit tests for the business Server Actions.
 * All DynamoDB interactions and auth are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock functions — must use vi.hoisted() so they are available when
// vi.mock() factories run (vi.mock is hoisted to the top by vitest).
// ---------------------------------------------------------------------------

const { mockPutBusiness, mockResolveUniqueSlug, mockGetBusinessById, mockGetSession, mockPutAsset } =
  vi.hoisted(() => ({
    mockPutBusiness: vi.fn(),
    mockResolveUniqueSlug: vi.fn(),
    mockGetBusinessById: vi.fn(),
    mockGetSession: vi.fn(),
    mockPutAsset: vi.fn(),
  }));

vi.mock('@/lib/db/businesses', () => ({
  putBusiness: mockPutBusiness,
  resolveUniqueSlug: mockResolveUniqueSlug,
  getBusinessById: mockGetBusinessById,
}));

vi.mock('@/lib/s3/assets', () => ({
  putAsset: mockPutAsset,
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: mockGetSession,
}));

// next/navigation redirect throws in test env — treat it as a success sentinel.
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { createBusinessAction, editBusinessAction } from '@/app/admin/(dashboard)/businesses/actions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, v);
  }
  return fd;
}

function makeFormDataWithFiles(
  fields: Record<string, string>,
  files: Record<string, File | File[]>,
): FormData {
  const fd = makeFormData(fields);
  for (const [k, v] of Object.entries(files)) {
    for (const file of Array.isArray(v) ? v : [v]) {
      fd.append(k, file);
    }
  }
  return fd;
}

const VALID_BUSINESS_FIELDS = {
  name: 'Green Leaf Landscaping',
  industry: 'landscaping',
  source: 'manual',
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authenticated session
  mockGetSession.mockResolvedValue({ sub: 'admin', expiresAt: new Date().toISOString() });
  // Default: slug is free
  mockResolveUniqueSlug.mockImplementation(async (slug: string) => slug);
  // Default: put succeeds
  mockPutBusiness.mockResolvedValue(undefined);
  mockPutAsset.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// createBusinessAction
// ---------------------------------------------------------------------------

describe('createBusinessAction — input validation', () => {
  it('returns validation errors when name is missing', async () => {
    const fd = makeFormData({ industry: 'plumbing', source: 'manual' });
    const result = await createBusinessAction(undefined, fd);
    expect(result?.errors?.name).toBeDefined();
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('returns validation errors when industry is invalid', async () => {
    const fd = makeFormData({ name: 'Test Biz', industry: 'invalid_industry', source: 'manual' });
    const result = await createBusinessAction(undefined, fd);
    expect(result?.errors?.industry).toBeDefined();
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('returns validation error for invalid email', async () => {
    const fd = makeFormData({ ...VALID_BUSINESS_FIELDS, email: 'not-an-email' });
    const result = await createBusinessAction(undefined, fd);
    expect(result?.errors?.email).toBeDefined();
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });

  it('returns validation error for invalid website URL', async () => {
    const fd = makeFormData({ ...VALID_BUSINESS_FIELDS, websiteUrl: 'not a url' });
    const result = await createBusinessAction(undefined, fd);
    expect(result?.errors?.websiteUrl).toBeDefined();
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });
});

describe('createBusinessAction — success flow', () => {
  it('puts a valid business and redirects to businesses list', async () => {
    const fd = makeFormData(VALID_BUSINESS_FIELDS);

    await expect(createBusinessAction(undefined, fd)).rejects.toThrow('REDIRECT:/admin/businesses');

    expect(mockPutBusiness).toHaveBeenCalledOnce();
    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.name).toBe('Green Leaf Landscaping');
    expect(saved.industry).toBe('landscaping');
    expect(saved.source).toBe('manual');
    expect(saved.businessId).toMatch(/^biz_/);
    expect(saved.status).toBe('pending');
  });

  it('normalises website URL by prepending https://', async () => {
    const fd = makeFormData({ ...VALID_BUSINESS_FIELDS, websiteUrl: 'example.com' });

    await expect(createBusinessAction(undefined, fd)).rejects.toThrow('REDIRECT:');

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.websiteUrl).toBe('https://example.com');
  });

  it('resolves slug uniqueness before saving', async () => {
    mockResolveUniqueSlug.mockResolvedValueOnce('green-leaf-landscaping-2');
    const fd = makeFormData(VALID_BUSINESS_FIELDS);

    await expect(createBusinessAction(undefined, fd)).rejects.toThrow('REDIRECT:');

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.slug).toBe('green-leaf-landscaping-2');
  });

  it('persists website-generation fields', async () => {
    const fd = makeFormData({
      ...VALID_BUSINESS_FIELDS,
      servicesOffered: 'Lawn care\nTree trimming',
      serviceAreas: 'Austin',
      description: 'A trusted local landscaper.',
      differentiators: 'Same-day quotes',
      brandTone: 'friendly',
      notes: 'Prefers email contact.',
    });

    await expect(createBusinessAction(undefined, fd)).rejects.toThrow('REDIRECT:');

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.servicesOffered).toBe('Lawn care\nTree trimming');
    expect(saved.serviceAreas).toBe('Austin');
    expect(saved.description).toBe('A trusted local landscaper.');
    expect(saved.differentiators).toBe('Same-day quotes');
    expect(saved.brandTone).toBe('friendly');
    expect(saved.notes).toBe('Prefers email contact.');
  });

  it('persists an explicit theme override', async () => {
    const fd = makeFormData({ ...VALID_BUSINESS_FIELDS, theme: 'green' });

    await expect(createBusinessAction(undefined, fd)).rejects.toThrow('REDIRECT:');

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.theme).toBe('green');
  });

  it('leaves theme undefined ("Auto") when no theme is selected', async () => {
    const fd = makeFormData(VALID_BUSINESS_FIELDS);

    await expect(createBusinessAction(undefined, fd)).rejects.toThrow('REDIRECT:');

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.theme).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Asset uploads
// ---------------------------------------------------------------------------

describe('createBusinessAction — asset uploads', () => {
  it('uploads a logo and sets logoUrl to the proxy path', async () => {
    const logo = new File(['fake-bytes'], 'logo.png', { type: 'image/png' });
    const fd = makeFormDataWithFiles(VALID_BUSINESS_FIELDS, { logo });

    await expect(createBusinessAction(undefined, fd)).rejects.toThrow('REDIRECT:');

    expect(mockPutAsset).toHaveBeenCalledOnce();
    const [key, , contentType] = mockPutAsset.mock.calls[0];
    expect(key).toMatch(/^businesses\/biz_.+\/assets\/logo\.png$/);
    expect(contentType).toBe('image/png');

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.logoUrl).toBe(`/api/assets/${key}`);
  });

  it('uploads multiple photos and sets photoUrls', async () => {
    const photos = [
      new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
    ];
    const fd = makeFormDataWithFiles(VALID_BUSINESS_FIELDS, { photos });

    await expect(createBusinessAction(undefined, fd)).rejects.toThrow('REDIRECT:');

    expect(mockPutAsset).toHaveBeenCalledTimes(2);
    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.photoUrls).toHaveLength(2);
    expect(saved.photoUrls[0]).toMatch(/^\/api\/assets\/businesses\/biz_.+\/assets\/photos\/0\.jpg$/);
  });

  it('does not call putAsset when no files are chosen', async () => {
    const fd = makeFormData(VALID_BUSINESS_FIELDS);
    await expect(createBusinessAction(undefined, fd)).rejects.toThrow('REDIRECT:');
    expect(mockPutAsset).not.toHaveBeenCalled();
    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.logoUrl).toBeUndefined();
  });
});

describe('createBusinessAction — auth', () => {
  it('returns Unauthorized when session is missing', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const fd = makeFormData(VALID_BUSINESS_FIELDS);
    const result = await createBusinessAction(undefined, fd);
    expect(result?.message).toBe('Unauthorized');
    expect(mockPutBusiness).not.toHaveBeenCalled();
  });
});

describe('createBusinessAction — DB failure', () => {
  it('returns a server-error message when putBusiness throws', async () => {
    mockPutBusiness.mockRejectedValueOnce(new Error('Connection failed'));
    const fd = makeFormData(VALID_BUSINESS_FIELDS);
    const result = await createBusinessAction(undefined, fd);
    expect(result?.message).toMatch(/failed to save/i);
  });
});

// ---------------------------------------------------------------------------
// editBusinessAction
// ---------------------------------------------------------------------------

const EXISTING_BUSINESS = {
  businessId: 'biz_00000000-0000-0000-0000-000000000001',
  slug: 'acme-plumbing',
  name: 'Acme Plumbing',
  industry: 'plumbing' as const,
  source: 'manual' as const,
  status: 'pending' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('editBusinessAction — success flow', () => {
  it('saves updated record and redirects to detail page', async () => {
    mockGetBusinessById.mockResolvedValueOnce(EXISTING_BUSINESS);
    mockPutBusiness.mockResolvedValue(undefined);

    const fd = makeFormData({
      name: 'Acme HVAC',
      industry: 'hvac',
      status: 'active',
      source: 'manual',
    });

    await expect(
      editBusinessAction(EXISTING_BUSINESS.businessId, undefined, fd),
    ).rejects.toThrow(`REDIRECT:/admin/businesses/${EXISTING_BUSINESS.businessId}`);

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.name).toBe('Acme HVAC');
    expect(saved.industry).toBe('hvac');
    expect(saved.status).toBe('active');
    expect(saved.businessId).toBe(EXISTING_BUSINESS.businessId);
  });

  it('preserves the existing logoUrl when no new file is chosen', async () => {
    mockGetBusinessById.mockResolvedValueOnce({
      ...EXISTING_BUSINESS,
      logoUrl: '/api/assets/businesses/biz_00000000-0000-0000-0000-000000000001/assets/logo.png',
    });

    const fd = makeFormData({ name: 'Acme HVAC', industry: 'hvac', status: 'active', source: 'manual' });

    await expect(
      editBusinessAction(EXISTING_BUSINESS.businessId, undefined, fd),
    ).rejects.toThrow('REDIRECT:');

    expect(mockPutAsset).not.toHaveBeenCalled();
    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.logoUrl).toBe(
      '/api/assets/businesses/biz_00000000-0000-0000-0000-000000000001/assets/logo.png',
    );
  });

  it('replaces the logoUrl when a new logo is uploaded', async () => {
    mockGetBusinessById.mockResolvedValueOnce({
      ...EXISTING_BUSINESS,
      logoUrl: '/api/assets/businesses/biz_00000000-0000-0000-0000-000000000001/assets/logo.png',
    });
    const newLogo = new File(['new'], 'new-logo.png', { type: 'image/png' });
    const fd = makeFormDataWithFiles(
      { name: 'Acme HVAC', industry: 'hvac', status: 'active', source: 'manual' },
      { logo: newLogo },
    );

    await expect(
      editBusinessAction(EXISTING_BUSINESS.businessId, undefined, fd),
    ).rejects.toThrow('REDIRECT:');

    expect(mockPutAsset).toHaveBeenCalledOnce();
    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.logoUrl).toMatch(/logo\.png$/);
    expect(saved.logoUrl).toContain(EXISTING_BUSINESS.businessId);
  });
});

describe('editBusinessAction — not found', () => {
  it('returns error message when business does not exist', async () => {
    mockGetBusinessById.mockResolvedValueOnce(null);
    const fd = makeFormData({ name: 'X', industry: 'plumbing', status: 'pending', source: 'manual' });
    const result = await editBusinessAction('biz_notfound', undefined, fd);
    expect(result?.message).toBe('Business not found');
  });
});

describe('editBusinessAction — auth', () => {
  it('returns Unauthorized when session is missing', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const fd = makeFormData({ name: 'X', industry: 'plumbing', status: 'pending', source: 'manual' });
    const result = await editBusinessAction(EXISTING_BUSINESS.businessId, undefined, fd);
    expect(result?.message).toBe('Unauthorized');
  });
});
