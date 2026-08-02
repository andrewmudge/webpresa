import type { SitePreview } from '@/domain/models/site-preview';

export type WebsiteState = 'live' | 'draft' | 'none';

export interface WebsiteStatus {
  /** 'live' — a published preview exists with nothing newer on top.
   *  'draft' — the newest preview isn't published yet, but an older
   *   published sibling still is (unpublished changes waiting).
   *  'none' — nothing has ever been published. */
  state: WebsiteState;
  hasDraft: boolean;
  latest: SitePreview | undefined;
  publishedPreview: SitePreview | undefined;
}

/**
 * The single "Live / Draft changes / No live site" derivation (Stage 19.A).
 * Previously re-implemented independently in 6+ pages (business home,
 * website editor, settings, and three onboarding pages) despite
 * `architecture.md` describing it as one shared computation — it wasn't.
 * This is that shared computation, extracted verbatim from the
 * highest-traffic call site (business home) so behavior doesn't change.
 *
 * Pure — no new stored field. `previews` must already be sorted
 * newest-first, matching `listPreviewsForBusiness`'s existing contract
 * (every call site already assumes `previews[0]` is the latest version).
 */
export function deriveWebsiteStatus(previews: SitePreview[]): WebsiteStatus {
  const publishedPreview = previews.find((p) => p.status === 'published');
  const latest = previews[0];
  const hasDraft = !!latest && latest.status !== 'published' && !!publishedPreview;
  const state: WebsiteState = publishedPreview ? (hasDraft ? 'draft' : 'live') : 'none';
  return { state, hasDraft, latest, publishedPreview };
}
