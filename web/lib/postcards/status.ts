import type { Postcard } from '@/domain/models/postcard';

/**
 * Derived (never stored) postcard-lifecycle status, shared by the campaign
 * admin UI (`CampaignDetail.tsx`) and the Stage 24 Operations page's
 * "Needs Attention" aggregation — extracted from `CampaignDetail.tsx`,
 * where it originated, so both surfaces use exactly one implementation of
 * the render-failure inference below rather than a second, driftable copy.
 */
export type RecipientPostcardStatus = 'no_postcard' | 'render_failed' | 'not_approved' | 'approved' | 'submitted';

export function derivePostcardStatus(postcard: Postcard | null | undefined): RecipientPostcardStatus {
  if (!postcard) return 'no_postcard';
  if (postcard.status === 'submitted' || postcard.status === 'mailed' || postcard.status === 'delivered') return 'submitted';
  if (postcard.reviewedAt) return 'approved';
  // Rendering runs synchronously right after creation (`renderPostcardArtifacts`)
  // and silently leaves the record at `pending` with no artifact keys on
  // failure — indistinguishable from a normal "awaiting approval" postcard
  // without this check. See `retryRenderPostcardAction`.
  if (postcard.status === 'pending' && !postcard.frontArtifactKey) return 'render_failed';
  return 'not_approved';
}
