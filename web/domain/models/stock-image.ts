import type { Industry } from '@/domain/constants/industries';
import type { MutableTimestampedRecord } from './common';

// ---------------------------------------------------------------------------
// Stock image repository (Phase 1 — curated hero-image fallback)
//
// A Webpresa-curated, admin-uploaded image, distinct from anything a
// business's own owner uploads (`Business.photoUrls`) or anything Firecrawl
// discovers on a business's own site (`ScanImageAsset`). Served publicly via
// CloudFront — never through the private `/api/assets/...` proxy the other
// two image sources use — since stock photography is never sensitive and is
// reused across many businesses, unlike per-business assets.
//
// `kind: 'hero'` records have an independently-uploaded `desktop` image and
// an optional, independently-uploaded `mobile` image — never derived or
// cropped from one another. The auto hero-pick fallback tier (see
// `lib/image/resolve-hero-image.ts`) only ever selects from these; when a
// set has no dedicated `mobile` image, that tier falls back to reusing
// `desktop` on mobile rather than requiring one. `kind: 'general'` records
// are a single image with no mobile companion at all — unused by any
// auto-pick logic in Phase 1; they exist so the Phase 2 browsable/filterable
// picker (across ALL stock photos, not just an industry auto-pick) has a
// broader pool to draw from without a schema change later.
// ---------------------------------------------------------------------------

export const STOCK_IMAGE_KINDS = ['hero', 'general'] as const;
export type StockImageKind = (typeof STOCK_IMAGE_KINDS)[number];

export const STOCK_IMAGE_STATUSES = ['active', 'archived'] as const;
export type StockImageStatus = (typeof STOCK_IMAGE_STATUSES)[number];

export interface StockImageVariant {
  /** S3 key under the dedicated stock-images bucket — never the assets bucket. */
  s3Key: string;
  /** Public CloudFront URL — always our own CDN domain, never a raw S3 URL. */
  url: string;
  width: number;
  height: number;
}

export interface StockImage extends MutableTimestampedRecord {
  /** Format: stock_<uuid>. Identifies one hero image group (`kind: 'hero'`, desktop + optional independent mobile) or one standalone image (`kind: 'general'`). */
  stockImageId: string;
  kind: StockImageKind;
  /** Curated industry this image is categorized under. Absent = the general/uncategorized pool (Phase 2). */
  industry?: Industry;
  /** The desktop (for `'hero'`) or only (for `'general'`) image, as uploaded — never cropped. */
  desktop: StockImageVariant;
  /** An independently-uploaded mobile image, for `kind: 'hero'` only. Optional — a hero set may have only a desktop image. */
  mobile?: StockImageVariant;
  status: StockImageStatus;
  /**
   * At most one `true` per (industry, kind) group — enforced by
   * `setDefaultStockImageAction`, not this schema, the same pattern
   * `MAX_BUSINESS_PHOTOS` already uses for an action-layer invariant.
   * The auto hero-pick tier prefers the default set when one exists, else
   * the most-recently-uploaded active set for that industry.
   */
  isDefault: boolean;
  uploadedBy?: string;
}
