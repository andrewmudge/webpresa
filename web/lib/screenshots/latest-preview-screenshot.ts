import 'server-only';
import { listScansForBusiness } from '@/lib/db/scan-events';
import { getSignedAssetUrl } from '@/lib/s3/assets';

export interface LatestPreviewScreenshots {
  desktopSrc?: string;
  mobileSrc?: string;
}

/**
 * Resolves the latest `generated_preview` Playwright capture (Stage 14) for
 * a business into short-lived signed URLs for whichever viewport(s)
 * actually completed — a `'partial'` capture may only have one of the two.
 * Signed for an hour rather than `getSignedAssetUrl`'s 5-minute default,
 * since a customer may sit on a page reading before moving on. Shared by
 * the activation (`/account/claim-status`) and checkout-success pages,
 * which both show the business's own already-built site as a static image
 * instead of a live iframe embed. Returns `{}` (both undefined) when no
 * capture has ever completed — callers render nothing in that case.
 */
export async function getLatestPreviewScreenshots(businessId: string): Promise<LatestPreviewScreenshots> {
  const scans = await listScansForBusiness(businessId);
  const latest = scans.find(
    (s) =>
      s.provider === 'playwright' &&
      s.targetType === 'generated_preview' &&
      (s.status === 'completed' || s.status === 'partial'),
  );
  const results = latest?.captureResults;
  if (!results) return {};

  const [desktopSrc, mobileSrc] = await Promise.all([
    results.desktop?.status === 'completed' && results.desktop.storageKey
      ? getSignedAssetUrl(results.desktop.storageKey, 3600)
      : undefined,
    results.mobile?.status === 'completed' && results.mobile.storageKey
      ? getSignedAssetUrl(results.mobile.storageKey, 3600)
      : undefined,
  ]);

  return { desktopSrc, mobileSrc };
}
