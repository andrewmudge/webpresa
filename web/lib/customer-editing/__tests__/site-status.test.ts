import { describe, it, expect } from 'vitest';
import { deriveWebsiteStatus } from '@/lib/customer-editing/site-status';
import type { SitePreview } from '@/domain/models/site-preview';

function preview(overrides: Partial<SitePreview> = {}): SitePreview {
  return {
    previewId: 'preview_1',
    businessId: 'biz_1',
    slug: 'acme',
    version: 1,
    status: 'draft',
    templateId: 'default',
    content: {} as SitePreview['content'],
    theme: { themeName: 'classicBlue' } as SitePreview['theme'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('deriveWebsiteStatus', () => {
  it('is "none" with no previews at all', () => {
    const status = deriveWebsiteStatus([]);
    expect(status.state).toBe('none');
    expect(status.hasDraft).toBe(false);
    expect(status.latest).toBeUndefined();
    expect(status.publishedPreview).toBeUndefined();
  });

  it('is "none" when only a draft exists and nothing has ever published', () => {
    const draft = preview({ previewId: 'preview_1', status: 'draft' });
    const status = deriveWebsiteStatus([draft]);
    expect(status.state).toBe('none');
    expect(status.hasDraft).toBe(false);
  });

  it('is "live" when the newest preview is the published one', () => {
    const published = preview({ previewId: 'preview_2', status: 'published' });
    const status = deriveWebsiteStatus([published]);
    expect(status.state).toBe('live');
    expect(status.hasDraft).toBe(false);
    expect(status.publishedPreview?.previewId).toBe('preview_2');
  });

  it('is "draft" when a newer non-published preview sits on top of a published one', () => {
    const draft = preview({ previewId: 'preview_2', status: 'draft' });
    const published = preview({ previewId: 'preview_1', status: 'published' });
    // previews[] must already be newest-first, matching listPreviewsForBusiness's contract
    const status = deriveWebsiteStatus([draft, published]);
    expect(status.state).toBe('draft');
    expect(status.hasDraft).toBe(true);
    expect(status.latest?.previewId).toBe('preview_2');
    expect(status.publishedPreview?.previewId).toBe('preview_1');
  });

  it('treats "ready" the same as "draft" — unpublished, not yet live', () => {
    const ready = preview({ previewId: 'preview_2', status: 'ready' });
    const published = preview({ previewId: 'preview_1', status: 'published' });
    const status = deriveWebsiteStatus([ready, published]);
    expect(status.state).toBe('draft');
    expect(status.hasDraft).toBe(true);
  });
});
