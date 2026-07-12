import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBusinessById } from '@/lib/db/businesses';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { listScansForBusiness } from '@/lib/db/scan-events';
import { listPostcardsForBusiness } from '@/lib/db/postcards';
import type { Business } from '@/domain/models/business';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
}

export default async function BusinessDetailPage({ params }: Props) {
  const { businessId } = await params;

  const [business, previews, scans, postcards] = await Promise.all([
    getBusinessById(businessId),
    listPreviewsForBusiness(businessId).catch(() => []),
    listScansForBusiness(businessId).catch(() => []),
    listPostcardsForBusiness(businessId).catch(() => []),
  ]);

  if (!business) notFound();

  return (
    <div className="p-8 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400 mb-6">
        <Link href="/admin/businesses" className="hover:text-[--color-brand]">
          Businesses
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700 truncate max-w-xs inline-block">{business.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{business.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {business.industry.replace('_', ' ')} · {business.slug}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/businesses/${businessId}/edit`}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white text-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — identity & contact */}
        <div className="lg:col-span-2 space-y-6">
          <DetailCard title="Identity">
            <DetailRow label="Name" value={business.name} />
            {business.legalName && <DetailRow label="Legal name" value={business.legalName} />}
            <DetailRow label="Industry" value={business.industry.replace('_', ' ')} />
            <DetailRow label="Slug" value={business.slug} />
            <DetailRow label="Source" value={business.source} />
            <StatusRow status={business.status} />
          </DetailCard>

          <DetailCard title="Contact">
            {business.phone ? <DetailRow label="Phone" value={business.phone} /> : <Empty label="Phone" />}
            {business.email ? <DetailRow label="Email" value={business.email} /> : <Empty label="Email" />}
            {business.websiteUrl ? (
              <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">Website</span>
                <a
                  href={business.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[--color-brand] hover:underline truncate max-w-xs"
                >
                  {business.websiteUrl}
                </a>
              </div>
            ) : (
              <Empty label="Website" />
            )}
            {business.googlePlaceId ? (
              <DetailRow label="Google Place ID" value={business.googlePlaceId} />
            ) : (
              <Empty label="Google Place ID" />
            )}
          </DetailCard>

          {business.address && (
            <DetailCard title="Address">
              <DetailRow label="Line 1" value={business.address.line1} />
              {business.address.line2 && <DetailRow label="Line 2" value={business.address.line2} />}
              <DetailRow label="City" value={business.address.city} />
              <DetailRow label="State" value={business.address.state} />
              <DetailRow label="Postal code" value={business.address.postalCode} />
              <DetailRow label="Country" value={business.address.country} />
            </DetailCard>
          )}

          {/* Scores */}
          {business.scores && (
            <DetailCard title="Scores">
              {Object.entries(business.scores)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => (
                  <ScoreRow key={k} label={k} value={v as number} />
                ))}
            </DetailCard>
          )}
        </div>

        {/* Right column — history & IDs */}
        <div className="space-y-6">
          {/* Timestamps */}
          <DetailCard title="Timestamps">
            <DetailRow label="Created" value={new Date(business.createdAt).toLocaleString()} />
            <DetailRow label="Updated" value={new Date(business.updatedAt).toLocaleString()} />
          </DetailCard>

          {/* Stripe */}
          {(business.stripeCustomerId || business.stripeSubscriptionId) && (
            <DetailCard title="Billing">
              {business.stripeCustomerId && (
                <DetailRow label="Stripe customer" value={business.stripeCustomerId} mono />
              )}
              {business.stripeSubscriptionId && (
                <DetailRow label="Subscription" value={business.stripeSubscriptionId} mono />
              )}
            </DetailCard>
          )}

          {/* Previews summary */}
          <HistoryCard
            title="Previews"
            count={previews.length}
            viewAllHref="/admin/previews"
            items={previews.slice(0, 3).map((p) => ({
              id: p.previewId,
              label: `v${p.version} — ${p.status}`,
              date: p.createdAt,
            }))}
          />

          {/* Scans summary */}
          <HistoryCard
            title="Scans"
            count={scans.length}
            viewAllHref="/admin/scans"
            items={scans.slice(0, 3).map((s) => ({
              id: s.scanId,
              label: s.status,
              date: s.createdAt,
            }))}
          />

          {/* Postcards summary */}
          <HistoryCard
            title="Postcards"
            count={postcards.length}
            viewAllHref="/admin/postcards"
            items={postcards.slice(0, 3).map((p) => ({
              id: p.postcardId,
              label: p.status,
              date: p.createdAt,
            }))}
          />
        </div>
      </div>

      {/* Unavailable actions notice */}
      <div className="mt-8 rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-400 text-center">
        Actions — <em>Create preview, Run scan, Generate postcard, Publish preview</em> — will be
        available in later stages.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 shrink-0 mr-4">{label}</span>
      <span className={`text-sm text-gray-900 truncate text-right ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-300 italic">not set</span>
    </div>
  );
}

function StatusRow({ status }: { status: Business['status'] }) {
  const colors: Record<Business['status'], string> = {
    active: 'text-green-700 bg-green-50',
    pending: 'text-yellow-700 bg-yellow-50',
    inactive: 'text-gray-600 bg-gray-50',
    archived: 'text-red-600 bg-red-50',
  };
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">Status</span>
      <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${colors[status]}`}>
        {status}
      </span>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="py-1.5 border-b border-gray-50 last:border-0">
      <div className="flex justify-between mb-1">
        <span className="text-sm text-gray-500 capitalize">{label}</span>
        <span className="text-sm font-medium text-gray-800">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-[--color-brand]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function HistoryCard({
  title,
  count,
  viewAllHref,
  items,
}: {
  title: string;
  count: number;
  viewAllHref: string;
  items: { id: string; label: string; date: string }[];
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h2>
        <span className="text-xs text-gray-400">{count}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-300 italic">None</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between text-xs">
              <span className="text-gray-600 capitalize">{item.label}</span>
              <span className="text-gray-400">{new Date(item.date).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      )}
      {count > 3 && (
        <Link href={viewAllHref} className="mt-2 block text-xs text-[--color-brand] hover:underline">
          View all {count} →
        </Link>
      )}
    </div>
  );
}
