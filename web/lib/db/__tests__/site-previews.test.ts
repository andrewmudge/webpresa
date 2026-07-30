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

import { getPreviewsBySlug, getSitePreviewById, putSitePreview, publishSitePreview, ensureDraftPreview } from '@/lib/db/site-previews';
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

// ---------------------------------------------------------------------------
// publishSitePreview
// ---------------------------------------------------------------------------

describe('publishSitePreview', () => {
  it('returns null when the target preview does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined }); // getSitePreviewById
    const result = await publishSitePreview('preview_notfound');
    expect(result).toBeNull();
  });

  it('publishes the target preview', async () => {
    const target = makePreview({ status: 'draft' });
    mockSend.mockResolvedValueOnce({ Item: target }); // getSitePreviewById
    mockSend.mockResolvedValueOnce({ Items: [target] }); // listPreviewsForBusiness (no other siblings)
    mockSend.mockResolvedValueOnce({}); // putSitePreview (publish target)

    const result = await publishSitePreview(target.previewId);

    expect(result?.status).toBe('published');
    const publishCall = mockSend.mock.calls[2][0].input;
    expect(publishCall.Item.previewId).toBe(target.previewId);
    expect(publishCall.Item.status).toBe('published');
  });

  it('archives a different currently-published sibling for the same business', async () => {
    const target = makePreview({ status: 'draft', previousVersion: 1 }); // version 2
    const previouslyPublished = makePreview({ status: 'published', previousVersion: 0 }); // version 1

    mockSend.mockResolvedValueOnce({ Item: target }); // getSitePreviewById
    mockSend.mockResolvedValueOnce({ Items: [target, previouslyPublished] }); // listPreviewsForBusiness
    mockSend.mockResolvedValueOnce({}); // putSitePreview (archive sibling)
    mockSend.mockResolvedValueOnce({}); // putSitePreview (publish target)

    await publishSitePreview(target.previewId);

    const archiveCall = mockSend.mock.calls[2][0].input;
    expect(archiveCall.Item.previewId).toBe(previouslyPublished.previewId);
    expect(archiveCall.Item.status).toBe('archived');

    const publishCall = mockSend.mock.calls[3][0].input;
    expect(publishCall.Item.previewId).toBe(target.previewId);
    expect(publishCall.Item.status).toBe('published');
  });

  it('does not touch draft/ready/archived siblings, only a published one', async () => {
    const target = makePreview({ status: 'draft', previousVersion: 2 });
    const draftSibling = makePreview({ status: 'draft', previousVersion: 0 });
    const archivedSibling = makePreview({ status: 'archived', previousVersion: 1 });

    mockSend.mockResolvedValueOnce({ Item: target });
    mockSend.mockResolvedValueOnce({ Items: [target, draftSibling, archivedSibling] });
    mockSend.mockResolvedValueOnce({}); // putSitePreview (publish target) — the only put call

    await publishSitePreview(target.previewId);

    expect(mockSend).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// ensureDraftPreview (Stage 19 — customer copy-on-write draft safety)
// ---------------------------------------------------------------------------

describe('ensureDraftPreview', () => {
  it('returns null when the business has no preview at all', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] }); // listPreviewsForBusiness
    const result = await ensureDraftPreview('biz_00000000-0000-0000-0000-000000000001');
    expect(result).toBeNull();
    expect(mockSend).toHaveBeenCalledTimes(1); // no put — nothing to clone
  });

  it('returns the existing preview unchanged when it is already a draft', async () => {
    const draft = makePreview({ status: 'draft' });
    mockSend.mockResolvedValueOnce({ Items: [draft] }); // listPreviewsForBusiness

    const result = await ensureDraftPreview(draft.businessId);

    expect(result?.previewId).toBe(draft.previewId);
    expect(result?.version).toBe(draft.version);
    expect(mockSend).toHaveBeenCalledTimes(1); // list only — never patches in place itself
  });

  it('returns the existing preview unchanged when it is "ready"', async () => {
    const ready = makePreview({ status: 'ready' });
    mockSend.mockResolvedValueOnce({ Items: [ready] });

    const result = await ensureDraftPreview(ready.businessId);

    expect(result?.previewId).toBe(ready.previewId);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('clones a published preview into a new draft version — never mutates the published one', async () => {
    const published = makePreview({ status: 'published' }); // version 1
    mockSend.mockResolvedValueOnce({ Items: [published] }); // listPreviewsForBusiness
    mockSend.mockResolvedValueOnce({}); // putSitePreview (the new draft clone)

    const result = await ensureDraftPreview(published.businessId);

    expect(result).not.toBeNull();
    expect(result?.previewId).not.toBe(published.previewId); // a genuinely new record
    expect(result?.version).toBe(published.version + 1);
    expect(result?.status).toBe('draft');
    expect(result?.content).toEqual(published.content);
    expect(result?.theme).toEqual(published.theme);

    // The put call wrote the clone, not the original published record.
    const putCall = mockSend.mock.calls[1][0].input;
    expect(putCall.Item.previewId).toBe(result?.previewId);
    expect(putCall.Item.status).toBe('draft');
  });

  it('clones an archived preview into a new draft version', async () => {
    const archived = makePreview({ status: 'archived' });
    mockSend.mockResolvedValueOnce({ Items: [archived] });
    mockSend.mockResolvedValueOnce({});

    const result = await ensureDraftPreview(archived.businessId);

    expect(result?.status).toBe('draft');
    expect(result?.version).toBe(archived.version + 1);
  });
});
