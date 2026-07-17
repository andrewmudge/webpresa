import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBusinessById } from '@/lib/db/businesses';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { listScansForBusiness } from '@/lib/db/scan-events';
import { listPostcardsForBusiness } from '@/lib/db/postcards';
import {
  // createSeedPreviewAction, — unused now that "Create test preview" is disabled (see Preview actions card below)
  updatePreviewCtaAction,
  updateBusinessDetailsAction,
  updatePhotosAction,
  saveWebsiteSectionsAction,
  applyRecommendedSectionsAction,
  resetWebsiteSectionsAction,
} from './actions';
import { buildDefaultCta } from './cta-defaults';
import { DeleteBusinessButton } from './DeleteBusinessButton';
import { CtaConfigForm } from './CtaConfigForm';
import { GenerateWebsiteButton } from './GenerateWebsiteButton';
import { SectionConfigForm } from './SectionConfigForm';
import { BusinessDetailsForm } from '../BusinessDetailsForm';
import { PhotosForm } from '../PhotosForm';
import type { SitePreview } from '@/domain/models/site-preview';
import { resolveStoredOrDefaultSections } from '@/lib/website-sections/resolve';
import { computeSectionAvailability, hasResolvableCta } from '@/lib/website-sections/availability';
import { describeHeroDimensionWarningsForPhotos } from '@/lib/image/hero-dimensions';

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

  const detailPageUrl = `/admin/businesses/${businessId}`;

  // Website section configuration (Stage 11.x) — resolved against the
  // business's most recent preview content when one exists, so admin
  // warnings ("enabled, but hidden — no content available yet") match what
  // the public preview would actually show.
  const latestContent = previews[0]?.content;
  const sectionAvailability = computeSectionAvailability({
    business,
    content: latestContent,
    hasCta: hasResolvableCta(business, latestContent),
  });
  const resolvedSections = resolveStoredOrDefaultSections(business.websiteSections);

  const heroPhotoWarnings = await describeHeroDimensionWarningsForPhotos(business.photoUrls ?? []);

  return (
    <div className="p-8 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400 mb-6">
        <Link href="/admin/businesses" className="hover:text-(--color-brand)">
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
        <DeleteBusinessButton
          businessId={businessId}
          businessName={business.name}
          previewCount={previews.length}
          scanCount={scans.length}
          postcardCount={postcards.length}
        />
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <DetailCard title="Timestamps">
          <DetailRow label="Created" value={new Date(business.createdAt).toLocaleString()} />
          <DetailRow label="Updated" value={new Date(business.updatedAt).toLocaleString()} />
        </DetailCard>

        {business.scores && (
          <DetailCard title="Scores">
            {Object.entries(business.scores)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => (
                <ScoreRow key={k} label={k} value={v as number} />
              ))}
          </DetailCard>
        )}

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
      </div>

      {/* History */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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

      {/* Business Details — everything is editable directly on this page; there is no separate edit screen. */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Business Details</h3>
        <BusinessDetailsForm
          action={updateBusinessDetailsAction.bind(null, businessId, detailPageUrl)}
          defaults={business}
          submitLabel="Save Details"
        />
      </div>

      {/* Photos */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Photos</h3>
        <PhotosForm
          action={updatePhotosAction.bind(null, businessId, detailPageUrl)}
          defaults={business}
          submitLabel="Save Photos"
          heroPhotoWarnings={heroPhotoWarnings}
        />
      </div>

      {/* Actions */}
      <div className="space-y-4">
        {/* CTA config — edits the most recent preview in place */}
        {previews.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Preview CTA — v{previews[0].version}
            </h3>
            <CtaConfigForm
              action={updatePreviewCtaAction.bind(null, previews[0].previewId)}
              defaults={previews[0].content.cta ?? buildDefaultCta(previews[0].content.contact)}
            />
          </div>
        )}

        {/* Website section configuration */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Website Sections</h3>
            <div className="flex gap-2">
              <form action={applyRecommendedSectionsAction.bind(null, businessId)}>
                <button
                  type="submit"
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Apply Recommended Sections
                </button>
              </form>
              <form action={resetWebsiteSectionsAction.bind(null, businessId)}>
                <button
                  type="submit"
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Reset to Defaults
                </button>
              </form>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Required sections always render. Enable or disable optional sections and set their display order.
          </p>
          <SectionConfigForm
            action={saveWebsiteSectionsAction.bind(null, businessId)}
            sections={resolvedSections}
            availability={sectionAvailability}
          />
        </div>

        {/* Preview actions — kept last: the thing you look at once everything above is set up */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview</h3>
          <div className="flex flex-wrap items-center gap-3">
            {/* Create seed preview — disabled now that Generate Website is live.
            <form action={createSeedPreviewAction.bind(null, businessId)}>
              <button
                type="submit"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Create test preview
              </button>
            </form>
            */}
            {/* Generate a real AI website (Stage 11) — must match MAX_AI_GENERATIONS in actions.ts */}
            <GenerateWebsiteButton
              businessId={businessId}
              capReached={previews.filter((p: SitePreview) => p.generationMetadata).length >= 10}
            />
            {/* Links to existing published previews — disabled now that Generate Website is live.
            {previews.filter((p: SitePreview) => p.status === 'published').slice(0, 1).map((p: SitePreview) => (
              <a
                key={p.previewId}
                href={`/b/${p.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                View preview ↗
              </a>
            ))}
            */}
            {/* Review the latest AI-generated draft before publishing */}
            {previews[0]?.status === 'draft' && (
              <a
                href={`/b/${previews[0].slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 hover:bg-amber-100 transition-colors"
              >
                Review draft (v{previews[0].version}) ↗
              </a>
            )}
          </div>
          {previews.filter((p: SitePreview) => p.status === 'published').length > 0 && (
            <p className="mt-2 text-xs text-gray-400">
              URL: <span className="font-mono">/b/{business.slug}</span>
            </p>
          )}
        </div>

        {/* Deferred actions */}
        <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-400 text-center">
          Actions — <em>Run scan, Generate postcard, Publish preview (AI)</em> — will be
          available in later stages.
        </div>
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
          className="h-full rounded-full bg-(--color-brand)"
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
        <Link href={viewAllHref} className="mt-2 block text-xs text-(--color-brand) hover:underline">
          View all {count} →
        </Link>
      )}
    </div>
  );
}
