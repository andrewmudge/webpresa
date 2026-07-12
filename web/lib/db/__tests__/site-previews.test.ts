/**
 * Unit tests for the SitePreview repository.
 * All DynamoDB interactions are mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSend = vi.fn();

vi.mock('@/lib/db/client', () => ({
  getDynamoDBClient: () => ({ send: mockSend }),
  TABLE_SITE_PREVIEWS: () => 'webpresa-test-site-previews',
}));

vi.mock('server-only', () => ({}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { getPreviewsBySlug, getSitePreviewById, putSitePreview } from '@/lib/db/site-previews';
import { createSitePreview } from '@/domain/factories/site-preview.factory';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePreview(overrides: Partial<Parameters<typeof createSitePreview>[0]> & { status?: string } = {}) {
  const { status, ...factoryOverrides } = overrides;
  const preview = createSitePreview({
    businessId: 'biz_00000000-0000-0000-0000-000000000001',
    slug: 'acme-plumbing',
    templateId: 'local-business-v1',
    content: {
      hero: { headline: 'Acme Plumbing', subheadline: 'Quality plumbing.', ctaText: 'Get a Quote' },
      services: [{ name: 'Drain Cleaning', description: 'Fast drain service.' }],
      tagline: 'Trusted plumbing.',
      aboutText: 'We are Acme Plumbing.',
      contact: { phone: '555-1234' },
    },
    theme: { primaryColor: '#11455E', accentColor: '#CE9059', fontFamily: 'sans-serif' },
    ...factoryOverrides,
  });
  if (status) return { ...preview, status } as typeof preview;
  return preview;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getPreviewsBySlug
// ---------------------------------------------------------------------------

describe('getPreviewsBySlug', () => {
  it('returns an empty array when no previews exist for the slug', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    const result = await getPreviewsBySlug('no-such-slug');
    expect(result).toEqual([]);
  });

  it('returns previews sorted by version descending', async () => {
    const v1 = makePreview({ previousVersion: 0 }); // version 1
    const v2 = makePreview({ previousVersion: 1 }); // version 2
    const v3 = makePreview({ previousVersion: 2 }); // version 3

    // DynamoDB returns in arbitrary order
    mockSend.mockResolvedValueOnce({ Items: [v1, v3, v2] });

    const result = await getPreviewsBySlug('acme-plumbing');

    expect(result[0].version).toBe(3);
    expect(result[1].version).toBe(2);
    expect(result[2].version).toBe(1);
  });

  it('returns a single preview correctly', async () => {
    const preview = makePreview();
    mockSend.mockResolvedValueOnce({ Items: [preview] });

    const result = await getPreviewsBySlug('acme-plumbing');
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('acme-plumbing');
  });

  it('queries the slug-index GSI', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    await getPreviewsBySlug('test-slug');

    const arg = mockSend.mock.calls[0][0].input;
    expect(arg.IndexName).toBe('slug-index');
    expect(arg.ExpressionAttributeValues[':slug']).toBe('test-slug');
  });

  it('throws if DynamoDB returns an item that fails schema validation', async () => {
    mockSend.mockResolvedValueOnce({ Items: [{ previewId: 'bad' }] });
    await expect(getPreviewsBySlug('acme-plumbing')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getSitePreviewById
// ---------------------------------------------------------------------------

describe('getSitePreviewById', () => {
  it('returns null when the item does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });
    const result = await getSitePreviewById('preview_notfound');
    expect(result).toBeNull();
  });

  it('returns a valid preview when found', async () => {
    const preview = makePreview();
    mockSend.mockResolvedValueOnce({ Item: preview });
    const result = await getSitePreviewById(preview.previewId);
    expect(result?.previewId).toBe(preview.previewId);
  });
});

// ---------------------------------------------------------------------------
// putSitePreview
// ---------------------------------------------------------------------------

describe('putSitePreview', () => {
  it('calls PutCommand with the correct table and item', async () => {
    const preview = makePreview();
    mockSend.mockResolvedValueOnce({});

    await putSitePreview(preview);

    const arg = mockSend.mock.calls[0][0].input;
    expect(arg.TableName).toBe('webpresa-test-site-previews');
    expect(arg.Item.previewId).toBe(preview.previewId);
  });

  it('throws a ZodError for an invalid preview', async () => {
    const invalid = { ...makePreview(), status: 'not-a-status' } as unknown as Parameters<typeof putSitePreview>[0];
    await expect(putSitePreview(invalid)).rejects.toThrow();
    expect(mockSend).not.toHaveBeenCalled();
  });
});
