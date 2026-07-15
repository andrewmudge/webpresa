/**
 * Unit tests for the business Server Actions.
 * All DynamoDB interactions and auth are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock functions — must use vi.hoisted() so they are available when
// vi.mock() factories run (vi.mock is hoisted to the top by vitest).
// ---------------------------------------------------------------------------

const { mockPutBusiness, mockResolveUniqueSlug, mockGetSession } = vi.hoisted(() => ({
  mockPutBusiness: vi.fn(),
  mockResolveUniqueSlug: vi.fn(),
  mockGetSession: vi.fn(),
}));

vi.mock('@/lib/db/businesses', () => ({
  putBusiness: mockPutBusiness,
  resolveUniqueSlug: mockResolveUniqueSlug,
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

import { createBusinessAction } from '@/app/admin/(dashboard)/businesses/actions';

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
});

// ---------------------------------------------------------------------------
// createBusinessAction — wizard step 1 (business details, text-only)
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
  it('puts a valid business and redirects to the photos onboarding step', async () => {
    const fd = makeFormData(VALID_BUSINESS_FIELDS);

    await expect(createBusinessAction(undefined, fd)).rejects.toThrow(
      /^REDIRECT:\/admin\/businesses\/biz_[0-9a-f-]+\/onboarding\/photos$/,
    );

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

  it('persists a legal name when provided', async () => {
    const fd = makeFormData({ ...VALID_BUSINESS_FIELDS, legalName: 'Green Leaf Landscaping LLC' });

    await expect(createBusinessAction(undefined, fd)).rejects.toThrow('REDIRECT:');

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.legalName).toBe('Green Leaf Landscaping LLC');
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

  it('never touches asset fields — those belong to the photos onboarding step', async () => {
    const fd = makeFormData(VALID_BUSINESS_FIELDS);

    await expect(createBusinessAction(undefined, fd)).rejects.toThrow('REDIRECT:');

    const saved = mockPutBusiness.mock.calls[0][0];
    expect(saved.logoUrl).toBeUndefined();
    expect(saved.photoUrls).toBeUndefined();
    expect(saved.heroPhotoUrl).toBeUndefined();
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
