import 'server-only';
import { getAsset } from '@/lib/s3/assets';
import type { ScanEvent } from '@/domain/models/scan-event';
import type { WebsiteEnrichmentSnapshot } from '@/domain/models/website-enrichment';

/**
 * Loads the normalized enrichment snapshot from a business's most recent
 * *completed* scan, if any — shared by the business detail page (found
 * contact info) and anywhere else that needs the latest evidence without
 * duplicating the scan detail page's inline S3-read logic. Never throws —
 * a missing/unreadable artifact just means nothing to show.
 */
export async function getLatestSnapshotForBusiness(scans: ScanEvent[]): Promise<WebsiteEnrichmentSnapshot | null> {
  const latest = scans.find((s) => s.status === 'completed' && s.extractedArtifactKey);
  if (!latest?.extractedArtifactKey) return null;
  try {
    const buffer = await getAsset(latest.extractedArtifactKey);
    return buffer ? (JSON.parse(buffer.toString('utf8')) as WebsiteEnrichmentSnapshot) : null;
  } catch {
    return null;
  }
}
