import type { ScanEvent } from '@/domain/models/scan-event';
import { approveScanImagesAction } from './enrichment-actions';
import { ScanImageApprovalGrid } from './ScanImageApprovalGrid';

/**
 * Surfaces every not-yet-promoted Firecrawl-discovered image (from any of
 * this business's scans, not just the latest) inside the Photos card, so an
 * admin can add one — or several at once — to the canonical photo library
 * without leaving the business page. The scan detail page
 * (`/admin/scans/[scanId]`) offers the identical batch action for admins
 * who prefer to review scan-by-scan instead.
 */
export function ScanImageReview({
  businessId,
  scans,
  redirectTo,
}: {
  businessId: string;
  scans: ScanEvent[];
  redirectTo: string;
}) {
  const candidates = scans.flatMap((scan) =>
    (scan.images ?? [])
      .filter((image) => image.url && !image.promotedPhotoUrl)
      .map((image) => ({ image, scanId: scan.scanId })),
  );

  if (candidates.length === 0) return null;

  return (
    <div className="mt-5 pt-5 border-t border-gray-100">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Images found during website enrichment ({candidates.length})
      </h3>
      <p className="text-xs text-gray-400 mb-3">
        Discovered on the business&apos;s own website by Firecrawl — not yet part of this business&apos;s Photos. Select the ones
        you want and add them; nothing here is used until you do.
      </p>
      <ScanImageApprovalGrid images={candidates} action={approveScanImagesAction.bind(null, businessId, redirectTo)} />
    </div>
  );
}
