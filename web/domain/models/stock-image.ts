import type { Industry } from '@/domain/constants/industries';
import type { MutableTimestampedRecord } from './common';

// ---------------------------------------------------------------------------
// Stock image repository (Phase 1 — curated hero-image fallback)
//
// A flat photo gallery of Webpresa-curated, admin-uploaded images — distinct
// from anything a business's own owner uploads (`Business.photoUrls`) or
// anything Firecrawl discovers on a business's own site (`ScanImageAsset`).
// Served publicly via CloudFront — never through the private
// `/api/assets/...` proxy the other two image sources use — since stock
// photography is never sensitive and is reused across many businesses.
//
// Every StockImage is exactly one independently-uploaded image — there is no
// pairing between a desktop and a mobile image at the record level. A
// `kind: 'hero'` image is further tagged with `variant: 'desktop' | 'mobile'`
// so the gallery can be filtered industry → kind → variant, matching the
// admin upload/browse flow. The auto hero-pick fallback tier (see
// `lib/image/resolve-hero-image.ts`) looks up the default desktop hero and
// the default mobile hero for an industry as two entirely independent
// queries — one may exist without the other.
//
// `kind: 'general'` images have no `variant` — unused by any auto-pick logic
// in Phase 1; they exist so the Phase 2 browsable/filterable picker (across
// ALL stock photos, not just an industry auto-pick) has a broader pool to
// draw from without a schema change later.
// ---------------------------------------------------------------------------

export const STOCK_IMAGE_KINDS = ['hero', 'general'] as const;
export type StockImageKind = (typeof STOCK_IMAGE_KINDS)[number];

export const STOCK_HERO_VARIANTS = ['desktop', 'mobile'] as const;
export type StockHeroVariant = (typeof STOCK_HERO_VARIANTS)[number];

export const STOCK_IMAGE_STATUSES = ['active', 'archived'] as const;
export type StockImageStatus = (typeof STOCK_IMAGE_STATUSES)[number];

export interface StockImageAsset {
  /** S3 key under the dedicated stock-images bucket — never the assets bucket. */
  s3Key: string;
  /** Public CloudFront URL — always our own CDN domain, never a raw S3 URL. */
  url: string;
  width: number;
  height: number;
}

export interface StockImage extends MutableTimestampedRecord {
  /** Format: stock_<uuid>. Identifies exactly one uploaded image. */
  stockImageId: string;
  kind: StockImageKind;
  /** Required for `kind: 'hero'`; absent for `kind: 'general'`. */
  variant?: StockHeroVariant;
  /** Curated industry this image is categorized under. Absent = the general/uncategorized pool (Phase 2). */
  industry?: Industry;
  /** The image as uploaded — never cropped or resized. */
  image: StockImageAsset;
  status: StockImageStatus;
  /**
   * At most one `true` per (industry, kind, variant) group — enforced by
   * `setDefaultStockImageAction`, not this schema, the same pattern
   * `MAX_BUSINESS_PHOTOS` already uses for an action-layer invariant. The
   * auto hero-pick tier prefers the default image when one exists, else the
   * most-recently-uploaded active image for that exact group.
   */
  isDefault: boolean;
  uploadedBy?: string;
}
