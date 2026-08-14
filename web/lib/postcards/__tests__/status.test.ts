/**
 * Unit tests for the shared `derivePostcardStatus`, extracted from
 * `CampaignDetail.tsx` in Stage 24 so the Operations page's aggregation
 * uses the exact same render-failure inference as the campaign admin UI.
 */
import { describe, it, expect } from 'vitest';
import { derivePostcardStatus } from '../status';
import type { Postcard } from '@/domain/models/postcard';

function makePostcard(overrides: Partial<Postcard> = {}): Postcard {
  return {
    postcardId: 'postcard_1',
    businessId: 'biz_1',
    previewId: 'preview_1',
    provider: 'lob',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('derivePostcardStatus', () => {
  it('is no_postcard when there is no postcard at all', () => {
    expect(derivePostcardStatus(null)).toBe('no_postcard');
    expect(derivePostcardStatus(undefined)).toBe('no_postcard');
  });

  it('is render_failed for a pending postcard with no rendered front artifact', () => {
    expect(derivePostcardStatus(makePostcard({ status: 'pending', frontArtifactKey: undefined }))).toBe('render_failed');
  });

  it('is not_approved for a pending postcard that has rendered but not yet been reviewed', () => {
    expect(derivePostcardStatus(makePostcard({ status: 'pending', frontArtifactKey: 'key.pdf', reviewedAt: undefined }))).toBe('not_approved');
  });

  it('is approved once reviewedAt is set, even before submission', () => {
    expect(derivePostcardStatus(makePostcard({ status: 'pending', frontArtifactKey: 'key.pdf', reviewedAt: new Date().toISOString() }))).toBe('approved');
  });

  it('is submitted for submitted/mailed/delivered statuses', () => {
    expect(derivePostcardStatus(makePostcard({ status: 'submitted' }))).toBe('submitted');
    expect(derivePostcardStatus(makePostcard({ status: 'mailed' }))).toBe('submitted');
    expect(derivePostcardStatus(makePostcard({ status: 'delivered' }))).toBe('submitted');
  });
});
