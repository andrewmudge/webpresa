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
  updateThemeAction,
  updateAdminFieldsAction,
  updatePhotosAction,
  addBusinessPhotosAction,
  deleteBusinessPhotoAction,
  updateBusinessLogoAction,
  saveWebsiteSectionsAction,
  autoSaveWebsiteSectionsAction,
  applyRecommendedSectionsAction,
  resetWebsiteSectionsAction,
} from './actions';
import { buildDefaultCta } from './cta-defaults';
import { DeleteBusinessButton } from './DeleteBusinessButton';
import { CtaConfigForm } from './CtaConfigForm';
import { GenerateWebsiteButton } from './GenerateWebsiteButton';
import { EnrichmentSection } from './EnrichmentSection';
import { ScanImageReview } from './ScanImageReview';
import { FoundContactInfo } from './FoundContactInfo';
import { getLatestSnapshotForBusiness } from '@/lib/firecrawl/snapshot';
import { isRetryableFailureCategory } from '@/lib/firecrawl/retry';
import { SectionConfigForm } from './SectionConfigForm';
import { BusinessDetailsForm } from '../BusinessDetailsForm';
import { ThemeForm } from '../ThemeForm';
import { AdminFieldsForm } from '../AdminFieldsForm';
import { PhotosForm } from '../PhotosForm';
import { CollapsibleCard } from '../CollapsibleCard';
import type { SitePreview } from '@/domain/models/site-preview';
import { resolveStoredOrDefaultSections } from '@/lib/website-sections/resolve';
import { computeSectionAvailability, hasResolvableCta } from '@/lib/website-sections/availability';
import { describeHeroDimensionWarningsForPhotos } from '@/lib/image/hero-dimensions';
import { WEBSITE_SECTION_TYPES, type WebsiteSectionType } from '@/domain/constants/website-sections';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{
    expandedSection?: string;
    enrichmentResult?: string;
    photoApproval?: string;
    contactApproval?: string;
  }>;
}

export default async function BusinessDetailPage({ params, searchParams }: Props) {
  const { businessId } = await params;
  const { expandedSection: expandedSectionRaw, enrichmentResult, photoApproval, contactApproval } = await searchParams;
  const initialExpandedSection = (WEBSITE_SECTION_TYPES as readonly string[]).includes(expandedSectionRaw ?? '')
    ? (expandedSectionRaw as WebsiteSectionType)
    : undefined;

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
  const hasPendingScanImageReview = scans.some((s) => s.images?.some((i) => i.url && !i.promotedPhotoUrl));
  const latestSnapshot = await getLatestSnapshotForBusiness(scans);
  const hasPendingContactReview = !!(
    latestSnapshot &&
    ((latestSnapshot.contact.phones[0] && latestSnapshot.contact.phones[0] !== business.phone) ||
      (latestSnapshot.contact.emails[0] && latestSnapshot.contact.emails[0] !== business.email))
  );

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
        <div className="flex items-center gap-3">
          <PreviewLink previews={previews} />
          <DeleteBusinessButton
            businessId={businessId}
            businessName={business.name}
            previewCount={previews.length}
            scanCount={scans.length}
            postcardCount={postcards.length}
          />
        </div>
      </div>

      {/* Needs Attention — links straight down to whichever card actually needs a look, so setup doesn't require scanning the whole page. */}
      <NeedsAttentionStrip
        hasPendingScanImageReview={hasPendingScanImageReview}
        hasPendingContactReview={hasPendingContactReview}
        manualApprovalRequired={business.enrichmentStatus === 'manual_approval_required'}
        retryEligible={
          scans[0]?.status === 'failed' && !!scans[0]?.failureCategory && isRetryableFailureCategory(scans[0].failureCategory)
        }
      />

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
            href: p.status === 'archived' ? undefined : `/b/${p.slug}`,
          }))}
        />
        <HistoryCard
          title="Scans"
          count={scans.length}
          viewAllHref={`/admin/scans?businessId=${businessId}`}
          items={scans.slice(0, 3).map((s) => ({
            id: s.scanId,
            label: s.status,
            date: s.createdAt,
            href: `/admin/scans/${s.scanId}`,
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

      {/* Firecrawl website enrichment (Stage 13) — moved up front: for a newly-imported business this is usually the first thing an admin does. */}
      <div id="enrichment-section" className="mb-6 scroll-mt-20">
        <EnrichmentSection business={business} scans={scans} previews={previews} resultQuery={enrichmentResult} />
      </div>

      {/* Business Details — everything is editable directly on this page; there is no separate edit screen. */}
      <CollapsibleCard
        id="business-details-card"
        title="Business Details"
        defaultOpen={!!contactApproval || hasPendingContactReview}
      >
        <BusinessDetailsForm
          action={updateBusinessDetailsAction.bind(null, businessId, detailPageUrl)}
          defaults={business}
          submitLabel="Save Details"
        />
        <FoundContactInfo
          businessId={businessId}
          business={business}
          snapshot={latestSnapshot}
          redirectTo={detailPageUrl}
          contactApproval={contactApproval}
        />
      </CollapsibleCard>

      {/* Theme */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Theme</h3>
        <ThemeForm
          action={updateThemeAction.bind(null, businessId, detailPageUrl)}
          defaults={business}
          submitLabel="Save Theme"
        />
      </div>

      {/* Admin */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Admin</h3>
        <AdminFieldsForm
          action={updateAdminFieldsAction.bind(null, businessId, detailPageUrl)}
          defaults={business}
          submitLabel="Save"
        />
      </div>

      {/* Photos */}
      <CollapsibleCard id="photos-card" title="Photos" defaultOpen={hasPendingScanImageReview}>
        <PhotosForm
          action={updatePhotosAction.bind(null, businessId, detailPageUrl)}
          addPhotosAction={addBusinessPhotosAction.bind(null, businessId)}
          deletePhotoAction={deleteBusinessPhotoAction.bind(null, businessId)}
          updateLogoAction={updateBusinessLogoAction.bind(null, businessId)}
          defaults={business}
          submitLabel="Save Photos"
          heroPhotoWarnings={heroPhotoWarnings}
        />
        {photoApproval && <PhotoApprovalBanner result={photoApproval} />}
        <ScanImageReview businessId={businessId} scans={scans} redirectTo={detailPageUrl} />
      </CollapsibleCard>

      {/* Actions */}
      <div className="space-y-4">
        {/* CTA config — edits the most recent preview in place */}
        {previews.length > 0 && (
          <CollapsibleCard title="Call to Action Buttons">
            <CtaConfigForm
              action={updatePreviewCtaAction.bind(null, previews[0].previewId)}
              defaults={previews[0].content.cta ?? buildDefaultCta(previews[0].content.contact)}
            />
          </CollapsibleCard>
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
            autoSaveAction={autoSaveWebsiteSectionsAction.bind(null, businessId)}
            sections={resolvedSections}
            availability={sectionAvailability}
            business={business}
            latestPreview={previews[0]}
            redirectTo={detailPageUrl}
            initialExpandedSection={initialExpandedSection}
          />
        </div>

        {/* Preview actions — kept last: the thing you look at once everything above is set up */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Preview</h3>
            <p className="text-xs text-gray-400 mb-3">
              Shows exactly what&apos;s saved right now — business details, component order, and every inline
              edit apply immediately, with no need to regenerate.
            </p>
            <PreviewLink previews={previews} />
            {previews.filter((p: SitePreview) => p.status === 'published').length > 0 && (
              <p className="mt-2 text-xs text-gray-400">
                Live URL: <span className="font-mono">/b/{business.slug}</span>
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Generate Website (AI)
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              {previews.length === 0
                ? 'Creates the first AI-written draft from the business details above.'
                : 'Creates a brand-new AI-written draft. Text edits and component reordering made since the last generation are NOT carried over — theme, CTA, and photo assignments are preserved.'}
            </p>
            <GenerateWebsiteButton
              businessId={businessId}
              nextVersion={(previews[0]?.version ?? 0) + 1}
              hasExistingPreview={previews.length > 0}
              capReached={previews.filter((p: SitePreview) => p.generationMetadata).length >= 10}
            />
          </div>
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

/**
 * Links to the current preview (`/b/{slug}`) — only shown when the most
 * recent preview is a draft awaiting review. Shared between the page
 * header (so it's visible immediately after opening the page) and the
 * "Preview" action card at the bottom, so both spots always agree.
 */
/**
 * Links to the current preview (`/b/{slug}`) — the live view of whatever is
 * actually saved right now, including every inline edit and reorder made so
 * far (those write in place, no regeneration needed to see them). Shown
 * whenever any viewable preview exists — archived previews 404 for everyone,
 * including admins, so those are excluded. Shared between the page header
 * (visible immediately on opening the page) and the "Preview" action card,
 * so both spots always agree.
 */
function PreviewLink({ previews }: { previews: SitePreview[] }) {
  const latest = previews[0];
  if (!latest || latest.status === 'archived') return null;

  const label =
    latest.status === 'draft'
      ? `Review draft (v${latest.version})`
      : latest.status === 'published'
        ? `View live site (v${latest.version})`
        : `Preview (v${latest.version})`;

  const isDraft = latest.status === 'draft';

  return (
    <a
      href={`/b/${latest.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className={
        isDraft
          ? 'rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 hover:bg-amber-100 transition-colors'
          : 'rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark transition-colors'
      }
    >
      {label} ↗
    </a>
  );
}

const PHOTO_APPROVAL_MESSAGES: Record<string, { tone: 'success' | 'warning' | 'error'; text: string }> = {
  added: { tone: 'success', text: 'Image added to Photos.' },
  already_added: { tone: 'warning', text: 'That image was already added to Photos.' },
  limit_reached: { tone: 'warning', text: 'Photo limit reached (6) — remove a photo below first.' },
  not_found: { tone: 'error', text: 'Could not find that image.' },
};

function PhotoApprovalBanner({ result }: { result: string }) {
  const copy = PHOTO_APPROVAL_MESSAGES[result];
  if (!copy) return null;
  const toneClass =
    copy.tone === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : copy.tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-red-200 bg-red-50 text-red-800';
  return <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${toneClass}`}>{copy.text}</div>;
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
  items: { id: string; label: string; date: string; href?: string }[];
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
          {items.map((item) => {
            const row = (
              <>
                <span className="text-gray-600 capitalize">{item.label}</span>
                <span className="text-gray-400">{new Date(item.date).toLocaleDateString()}</span>
              </>
            );
            return (
              <li key={item.id} className="text-xs">
                {item.href ? (
                  <Link href={item.href} target={item.href.startsWith('/b/') ? '_blank' : undefined} className="flex justify-between hover:text-(--color-brand) -mx-1 px-1 rounded hover:bg-gray-50 transition-colors">
                    {row}
                  </Link>
                ) : (
                  <div className="flex justify-between">{row}</div>
                )}
              </li>
            );
          })}
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

function NeedsAttentionStrip({
  hasPendingScanImageReview,
  hasPendingContactReview,
  manualApprovalRequired,
  retryEligible,
}: {
  hasPendingScanImageReview: boolean;
  hasPendingContactReview: boolean;
  manualApprovalRequired: boolean;
  retryEligible: boolean;
}) {
  const items: { label: string; href: string }[] = [];
  if (manualApprovalRequired) items.push({ label: 'Manual approval required', href: '#enrichment-section' });
  if (retryEligible) items.push({ label: 'Enrichment failed — retry available', href: '#enrichment-section' });
  if (hasPendingContactReview) items.push({ label: 'Contact info found on website', href: '#business-details-card' });
  if (hasPendingScanImageReview) items.push({ label: 'Images awaiting review', href: '#photos-card' });

  if (items.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Needs attention:</span>
      {items.map((item, i) => (
        <span key={item.href + item.label} className="text-xs">
          <a href={item.href} className="text-amber-800 underline hover:text-amber-900">
            {item.label}
          </a>
          {i < items.length - 1 && <span className="text-amber-300 ml-2">·</span>}
        </span>
      ))}
    </div>
  );
}
