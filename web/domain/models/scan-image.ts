// ---------------------------------------------------------------------------
// Website image ingestion (Stage 13 — Firecrawl Website Enrichment)
//
// An image discovered on a business's own website during a Firecrawl scan,
// fetched server-side, validated, and rehosted under the private scans/
// prefix. Never derived from Google Places. Never *automatically* written
// onto `Business.photoUrls` — these are scan-derived, provenance-tracked
// assets the generation pipeline may use as a fallback tier, distinct from
// admin-uploaded/approved business assets. An admin may explicitly promote
// one into the canonical Business photo library (`approveScanImageAction`,
// `app/admin/(dashboard)/businesses/[businessId]/enrichment-actions.ts`),
// which copies the object into `businesses/{businessId}/assets/photos/` and
// records the result in `promotedPhotoUrl` below — that promotion is always
// a deliberate admin action, never automatic.
// ---------------------------------------------------------------------------

export const WEBSITE_IMAGE_ROLES = [
  'logo',
  'hero',
  'service',
  'gallery',
  'team',
  'location',
  'unknown',
] as const;
export type WebsiteImageRole = (typeof WEBSITE_IMAGE_ROLES)[number];

export const WEBSITE_IMAGE_STATUSES = ['accepted', 'review_required', 'rejected'] as const;
export type WebsiteImageStatus = (typeof WEBSITE_IMAGE_STATUSES)[number];

/**
 * A single website image discovered and (if accepted/review_required)
 * rehosted during a scan. `url` is our own `/api/assets/...` proxy path —
 * never the original remote URL, which is preserved only in
 * `originalUrl` for provenance.
 */
export interface ScanImageAsset {
  imageId: string;
  /** Our own proxy URL — set only for `accepted`/`review_required` images that were actually uploaded. */
  url?: string;
  role: WebsiteImageRole;
  status: WebsiteImageStatus;
  width?: number;
  height?: number;
  sizeBytes?: number;
  contentType?: string;
  /** The original URL discovered on the business's website. Never hotlinked. */
  originalUrl: string;
  /** S3 key under `scans/{businessId}/{scanId}/images/` — set only when uploaded. */
  s3Key?: string;
  /** Short, admin-facing reason when `status` is `review_required` or `rejected`. */
  note?: string;
  /** Set once an admin explicitly promotes this image — the resulting `Business.photoUrls` entry. */
  promotedPhotoUrl?: string;
}
