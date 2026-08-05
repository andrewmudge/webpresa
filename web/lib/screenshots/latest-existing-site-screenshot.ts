import 'server-only';
import { listScansForBusiness } from '@/lib/db/scan-events';
import { getSignedAssetUrl } from '@/lib/s3/assets';
import type { LatestPreviewScreenshots } from './latest-preview-screenshot';

/**
 * Resolves the latest `existing_site` Playwright capture (Stage 14) for a
 * business into short-lived signed URLs — the "before" counterpart to
 * `getLatestPreviewScreenshots`'s "after", used together on a postcard's
 * front artwork (Stage 22). `existing_site` captures already exist and are
 * used internally by Stage 15 scoring (`lib/scoring/score-business.ts`), but
 * had no screenshot-serving reader until this one. Returns `{}` (both
 * undefined) when no capture has ever completed — callers render nothing in
 * that case.
 */
export async function getLatestExistingSiteScreenshots(businessId: string): Promise<LatestPreviewScreenshots> {
  const scans = await listScansForBusiness(businessId);
  const latest = scans.find(
    (s) =>
      s.provider === 'playwright' &&
      s.targetType === 'existing_site' &&
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
