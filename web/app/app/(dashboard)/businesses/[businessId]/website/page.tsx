import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { deriveWebsiteStatus } from '@/lib/customer-editing/site-status';
import { listDomainConnectionsForBusiness } from '@/lib/db/domain-connections';
import { ThemeTab } from './ThemeTab';
import { LogoTab } from './LogoTab';
import { ContentTab } from './ContentTab';
import { ServicesTab } from './ServicesTab';
import { PhotosTab } from './PhotosTab';
import { SectionsTab } from './SectionsTab';
import { ContactTab } from './ContactTab';
import { SeoTab } from './SeoTab';
import { DraftChangesNotice } from './DraftChangesNotice';
import { getCachedPreviews } from './data';
import { EditorShell } from './EditorShell';
import type { TabId } from './EditorTabNav';
import { WebsitePreviewCard } from '../WebsitePreviewCard';
import { SaveBanner } from '../SaveBanner';
import { publishDraftActionCustomer } from '../actions';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}

const STATUS_BADGE: Record<'live' | 'draft' | 'none', { label: string; className: string }> = {
  live: { label: 'Live', className: 'bg-green-100 text-green-800' },
  draft: { label: 'Draft changes', className: 'bg-amber-100 text-amber-800' },
  none: { label: 'No live site', className: 'bg-gray-100 text-gray-600' },
};

/**
 * Shown while a section's own data fetch (`getCachedPreviews`, see
 * `./data.ts`) is still in flight — each tab is an independently
 * `<Suspense>`-wrapped async component below, so the shell and nav render
 * immediately and tabs stream in as their (deduped, shared) data resolves,
 * rather than the whole page blocking on all eight at once. Every tab stays
 * mounted at all times (see `EditorShell`'s doc comment), so this fallback
 * is only ever visible on first load, never when switching tabs.
 */
function SectionSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 animate-pulse space-y-3">
      <div className="h-4 w-32 bg-gray-100 rounded" />
      <div className="h-3 w-full bg-gray-100 rounded" />
      <div className="h-3 w-2/3 bg-gray-100 rounded" />
    </div>
  );
}

export default async function WebsiteEditorPage({ params, searchParams }: Props) {
  const { businessId } = await params;
  const { error, saved } = await searchParams;
  const session = await requireCustomerSession();
  const business = await requireBusinessOwnership(session.sub, businessId);
  const { mode } = await requireBusinessAccess(session.sub, businessId);

  if (mode === 'none') redirect(`/app/businesses/${businessId}`);
  const isReadOnly = mode === 'billing_recovery';

  const previews = await getCachedPreviews(businessId);
  const { state, hasDraft, latest } = deriveWebsiteStatus(previews);
  const badge = STATUS_BADGE[state];

  // Same "prefer the active connected custom domain, else the real /b/[slug]
  // path" resolution business-home's own preview card doesn't currently do
  // but Stage 19.x's onboarding wizard already established as the honest
  // pattern (never fabricate a *.webpresa.io-style address) — see
  // WebsitePreviewCard's `customDomainUrl` doc comment. Deliberately
  // tolerant of this lookup failing outright (unlike every other read on
  // this page) — Stage 19.x's domain-connections table isn't deployed in
  // every environment yet (see deployment.md), and a business's public URL
  // is a nice-to-have enhancement to the preview's status bar, not
  // something the whole editor should go down over.
  let customDomainUrl: string | undefined;
  try {
    const domainConnections = await listDomainConnectionsForBusiness(businessId);
    const activeDomainConnection = domainConnections.find((c) => c.status === 'active');
    customDomainUrl = activeDomainConnection ? `https://${activeDomainConnection.primaryHostname}` : undefined;
  } catch (err) {
    console.error('Failed to resolve a custom domain for the preview status bar:', err instanceof Error ? err.message : err);
  }

  const tabs: Record<TabId, React.ReactNode> = {
    theme: <ThemeTab businessId={businessId} currentTheme={business.theme} isReadOnly={isReadOnly} />,
    logo: <LogoTab businessId={businessId} business={business} isReadOnly={isReadOnly} />,
    sections: (
      <Suspense fallback={<SectionSkeleton />}>
        <SectionsTab businessId={businessId} business={business} isReadOnly={isReadOnly} />
      </Suspense>
    ),
    content: (
      <Suspense fallback={<SectionSkeleton />}>
        <ContentTab businessId={businessId} business={business} isReadOnly={isReadOnly} />
      </Suspense>
    ),
    services: (
      <Suspense fallback={<SectionSkeleton />}>
        <ServicesTab businessId={businessId} business={business} isReadOnly={isReadOnly} />
      </Suspense>
    ),
    photos: (
      <Suspense fallback={<SectionSkeleton />}>
        <PhotosTab businessId={businessId} business={business} isReadOnly={isReadOnly} />
      </Suspense>
    ),
    contact: (
      <Suspense fallback={<SectionSkeleton />}>
        <ContactTab businessId={businessId} business={business} isReadOnly={isReadOnly} />
      </Suspense>
    ),
    seo: (
      <Suspense fallback={<SectionSkeleton />}>
        <SeoTab businessId={businessId} isReadOnly={isReadOnly} />
      </Suspense>
    ),
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="px-4 sm:px-6 pt-6 pb-4 space-y-3 shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Edit your website</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
            </div>
            <p className="mt-1 text-sm text-gray-500">Make changes to your content and see them live.</p>
          </div>
          {!isReadOnly && hasDraft && latest && (
            <form action={publishDraftActionCustomer.bind(null, businessId)}>
              <input type="hidden" name="previewId" value={latest.previewId} />
              <button
                type="submit"
                className="rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
              >
                Publish changes
              </button>
            </form>
          )}
        </div>
        <SaveBanner
          isReadOnly={isReadOnly}
          error={error}
          saved={saved}
          readOnlyMessage="Editing is paused until your billing issue is resolved. You can still view your current content below."
        />
      </div>

      <DraftChangesNotice
        businessId={businessId}
        draftPreviewId={hasDraft ? latest?.previewId : undefined}
        noticeEnabled={business.draftChangesNoticeEnabled !== false}
      />

      <EditorShell
        tabs={tabs}
        preview={
          <WebsitePreviewCard
            key={`${business.updatedAt}:${latest?.updatedAt ?? ''}`}
            slug={business.slug}
            lastUpdated={latest?.updatedAt}
            hasDraft={hasDraft}
            customDomainUrl={customDomainUrl}
          />
        }
      />
    </div>
  );
}
