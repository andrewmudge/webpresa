import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getScanEventById } from '@/lib/db/scan-events';
import { getBusinessById } from '@/lib/db/businesses';
import { getSitePreviewById } from '@/lib/db/site-previews';
import { getAsset } from '@/lib/s3/assets';
import type { WebsiteEnrichmentSnapshot } from '@/domain/models/website-enrichment';
import { approveScanImagesAction } from '@/app/admin/(dashboard)/businesses/[businessId]/enrichment-actions';
import { ScanImageApprovalGrid } from '@/app/admin/(dashboard)/businesses/[businessId]/ScanImageApprovalGrid';
import { viewRawArtifactAction } from './actions';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ scanId: string }>;
  searchParams: Promise<{ photoApproval?: string; added?: string; skipped?: string }>;
}

const PHOTO_APPROVAL_MESSAGES: Record<string, (added?: string, skipped?: string) => { tone: 'success' | 'warning' | 'error'; text: string }> = {
  added: () => ({ tone: 'success', text: 'Image added to the business’s Photos.' }),
  batch_added: (added, skipped) => ({
    tone: 'success',
    text: `${added} image${added === '1' ? '' : 's'} added to Photos.${skipped && skipped !== '0' ? ` ${skipped} skipped (already added or limit reached).` : ''}`,
  }),
  already_added: () => ({ tone: 'warning', text: 'That image was already added to Photos.' }),
  limit_reached: () => ({ tone: 'warning', text: 'Photo limit reached (6) — remove a photo in the Photos card first.' }),
  not_found: () => ({ tone: 'error', text: 'Could not find that image.' }),
  none_selected: () => ({ tone: 'warning', text: 'No images were selected.' }),
};

export default async function ScanDetailPage({ params, searchParams }: Props) {
  const { scanId } = await params;
  const { photoApproval, added, skipped } = await searchParams;
  const scan = await getScanEventById(scanId);
  if (!scan) notFound();

  const [business, preview] = await Promise.all([
    getBusinessById(scan.businessId),
    scan.generatedPreviewId ? getSitePreviewById(scan.generatedPreviewId) : Promise.resolve(null),
  ]);

  let snapshot: WebsiteEnrichmentSnapshot | null = null;
  let snapshotLoadError: string | undefined;
  if (scan.extractedArtifactKey) {
    try {
      const buffer = await getAsset(scan.extractedArtifactKey);
      snapshot = buffer ? (JSON.parse(buffer.toString('utf8')) as WebsiteEnrichmentSnapshot) : null;
    } catch (err) {
      snapshotLoadError = err instanceof Error ? err.message : 'Failed to load extracted data';
    }
  }

  const images = (scan.images ?? []).filter((i) => i.url);

  return (
    <div className="p-8 max-w-4xl">
      <nav className="text-sm text-gray-400 mb-6">
        <Link href="/admin/scans" className="hover:text-(--color-brand)">
          Scans
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700 font-mono text-xs">{scan.scanId}</span>
      </nav>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {business ? (
              <Link href={`/admin/businesses/${business.businessId}`} className="hover:text-(--color-brand) hover:underline">
                {business.name}
              </Link>
            ) : (
              scan.businessId
            )}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {scan.provider} · {scan.operation} · attempt {scan.attempt}
            {scan.retryOfScanId && (
              <>
                {' '}
                ·{' '}
                <Link href={`/admin/scans/${scan.retryOfScanId}`} className="hover:text-(--color-brand) hover:underline">
                  retry of {scan.retryOfScanId}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {business && (
            <Link
              href={`/admin/businesses/${business.businessId}`}
              className="rounded-lg border border-gray-300 text-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              View business
            </Link>
          )}
          {preview && (
            <a
              href={`/b/${preview.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark transition-colors"
            >
              View generated preview (v{preview.version}) ↗
            </a>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <DetailCard title="Scan">
          <DetailRow label="Status" value={scan.status.replace(/_/g, ' ')} />
          {scan.sourceUrl && <DetailRow label="Source URL" value={scan.sourceUrl} mono />}
          {scan.finalUrl && scan.finalUrl !== scan.sourceUrl && <DetailRow label="Final URL" value={scan.finalUrl} mono />}
          {scan.httpStatus !== undefined && <DetailRow label="HTTP status" value={String(scan.httpStatus)} />}
          <DetailRow label="Created" value={new Date(scan.createdAt).toLocaleString()} />
          {scan.startedAt && <DetailRow label="Started" value={new Date(scan.startedAt).toLocaleString()} />}
          {scan.completedAt && <DetailRow label="Completed" value={new Date(scan.completedAt).toLocaleString()} />}
        </DetailCard>

        {scan.status === 'failed' || scan.status === 'manual_approval_required' ? (
          <DetailCard title="Failure">
            {scan.failureCategory && <DetailRow label="Category" value={scan.failureCategory.replace(/_/g, ' ')} />}
            {scan.failureMessage && <DetailRow label="Message" value={scan.failureMessage} />}
          </DetailCard>
        ) : (
          <DetailCard title="Artifacts">
            {scan.rawArtifactKey && (
              <form action={viewRawArtifactAction.bind(null, scan.rawArtifactKey)}>
                <button type="submit" className="text-(--color-brand) hover:underline text-sm">
                  View raw crawl.json ↗
                </button>
              </form>
            )}
            {scan.extractedArtifactKey && (
              <form action={viewRawArtifactAction.bind(null, scan.extractedArtifactKey)} className="mt-1">
                <button type="submit" className="text-(--color-brand) hover:underline text-sm">
                  View extracted.json ↗
                </button>
              </form>
            )}
            {!scan.rawArtifactKey && !scan.extractedArtifactKey && <p className="text-sm text-gray-300 italic">None</p>}
          </DetailCard>
        )}
      </div>

      {/* Images */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Images {images.length > 0 && `(${images.filter((i) => i.status === 'accepted').length} accepted / ${images.length} found)`}
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          &quot;Accepted&quot; images are already used by the generated preview. &quot;Review required&quot; images were found but
          are below the automatic-use size threshold. Select any you want and add them to this business&apos;s Photos.
        </p>
        {photoApproval && <ResultBanner result={photoApproval} added={added} skipped={skipped} className="mb-4" />}
        {images.length === 0 ? (
          <p className="text-sm text-gray-300 italic">No images discovered on this scan.</p>
        ) : (
          <ScanImageApprovalGrid
            images={images.map((image) => ({ image, scanId: scan.scanId }))}
            action={approveScanImagesAction.bind(null, scan.businessId, `/admin/scans/${scanId}`)}
          />
        )}
      </div>

      {/* Extracted snapshot */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Extracted Website Data</h2>
        {snapshotLoadError && <p className="text-sm text-red-600">{snapshotLoadError}</p>}
        {!snapshotLoadError && !snapshot && <p className="text-sm text-gray-300 italic">No extracted data for this scan.</p>}
        {snapshot && <SnapshotView snapshot={snapshot} />}
      </div>
    </div>
  );
}

function ResultBanner({
  result,
  added,
  skipped,
  className = '',
}: {
  result: string;
  added?: string;
  skipped?: string;
  className?: string;
}) {
  const build = PHOTO_APPROVAL_MESSAGES[result];
  if (!build) return null;
  const copy = build(added, skipped);
  const toneClass =
    copy.tone === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : copy.tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-red-200 bg-red-50 text-red-800';
  return <div className={`rounded-lg border px-4 py-3 text-sm ${toneClass} ${className}`}>{copy.text}</div>;
}

function SnapshotView({ snapshot }: { snapshot: WebsiteEnrichmentSnapshot }) {
  return (
    <div className="space-y-4 text-sm">
      {snapshot.businessName && <DetailRow label="Business name found" value={snapshot.businessName} />}
      {snapshot.title && <DetailRow label="Page title" value={snapshot.title} />}
      {snapshot.metaDescription && <DetailRow label="Meta description" value={snapshot.metaDescription} />}
      {snapshot.summary && <DetailRow label="Summary" value={snapshot.summary} />}
      {snapshot.about && <DetailRow label="About" value={snapshot.about} />}

      {snapshot.services.length > 0 && (
        <SnapshotList title="Services" items={snapshot.services.map((s) => s.name + (s.description ? ` — ${s.description}` : ''))} />
      )}
      {snapshot.serviceAreas.length > 0 && <SnapshotList title="Service areas" items={snapshot.serviceAreas} />}
      {snapshot.faq.length > 0 && <SnapshotList title="FAQ" items={snapshot.faq.map((f) => `${f.question} — ${f.answer}`)} />}
      {snapshot.navigationLabels.length > 0 && <SnapshotList title="Navigation labels" items={snapshot.navigationLabels} />}
      {snapshot.callsToAction.length > 0 && <SnapshotList title="Calls to action" items={snapshot.callsToAction} />}
      {(snapshot.contact.phones.length > 0 || snapshot.contact.emails.length > 0 || snapshot.contact.addresses.length > 0) && (
        <SnapshotList
          title="Contact found on page"
          items={[...snapshot.contact.phones, ...snapshot.contact.emails, ...snapshot.contact.addresses]}
        />
      )}
      {snapshot.socialLinks.length > 0 && <SnapshotList title="Social links" items={snapshot.socialLinks} />}

      <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
        Extracted {new Date(snapshot.extractedAt).toLocaleString()} — this is evidence gathered from the business&apos;s website, not
        canonical business data. It never overwrites anything on the Business record; it only fills gaps left blank during generation
        unless an admin explicitly applies it.
      </p>
    </div>
  );
}

function SnapshotList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{title}</h3>
      <ul className="space-y-1 text-gray-700">
        {items.map((item, i) => (
          <li key={i} className="text-sm">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h2>
      <div>{children}</div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="py-1.5 border-b border-gray-50 last:border-0">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`text-gray-900 ${mono ? 'font-mono text-xs break-all' : 'text-sm'}`}>{value}</div>
    </div>
  );
}
