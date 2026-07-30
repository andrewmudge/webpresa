import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { ThemeTab } from './ThemeTab';
import { LogoTab } from './LogoTab';
import { ContentTab } from './ContentTab';
import { ServicesTab } from './ServicesTab';
import { PhotosTab } from './PhotosTab';
import { SectionsTab } from './SectionsTab';
import { ContactTab } from './ContactTab';
import { SeoTab } from './SeoTab';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}

const SECTIONS = [
  { id: 'theme', label: 'Theme' },
  { id: 'logo', label: 'Logo' },
  { id: 'sections', label: 'Sections' },
  { id: 'content', label: 'Content' },
  { id: 'services', label: 'Services' },
  { id: 'photos', label: 'Photos' },
  { id: 'contact', label: 'Contact & CTAs' },
  { id: 'seo', label: 'SEO' },
] as const;

/**
 * Shown while a section's own data fetch (`getCachedPreviews`, see
 * `./data.ts`) is still in flight — each section is an independently
 * `<Suspense>`-wrapped async component below, so the page shell and nav
 * render immediately and sections stream in as their (deduped, shared)
 * data resolves, rather than the whole page blocking on all six at once.
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Website</h1>
      <p className="mt-1 text-sm text-gray-500">
        Scroll through everything below, or jump straight to a section.
      </p>

      {isReadOnly && (
        <div role="alert" className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Editing is paused until your billing issue is resolved. You can still view your current content below.
        </div>
      )}
      {error && (
        <div role="alert" className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}
      {saved && !error && (
        <div role="status" className="mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Saved.
        </div>
      )}

      {/* Sticky once scrolled past its natural position, so the customer can
          always jump between sections without scrolling back to the top.
          `top-14` on mobile clears AppSidebar's own sticky hamburger bar
          (md:hidden); at md:+ that bar doesn't exist, so the nav sticks
          right under the very top of the screen instead. The visible gap
          above/below the nav card — matching the gap every other card on
          this page gets from `space-y-10` — lives INSIDE this sticky
          element (as padding, with the page's own background color) rather
          than as an outer margin, so that gap stays visible even once the
          nav is pinned and content is scrolling up underneath it. */}
      <div className="sticky top-14 md:top-0 z-20 pt-6 pb-6 bg-[#F0F4F8]">
        <nav className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto" aria-label="Jump to section">
          <div className="flex gap-1 min-w-max px-2">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="px-4 py-3 text-base font-semibold text-(--color-brand) border-b-2 border-transparent hover:border-(--color-brand) transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </nav>
      </div>

      <div className="space-y-10">
        <section id="theme" className="scroll-mt-20">
          <ThemeTab businessId={businessId} currentTheme={business.theme} isReadOnly={isReadOnly} />
        </section>

        <section id="logo" className="scroll-mt-20">
          <LogoTab businessId={businessId} business={business} isReadOnly={isReadOnly} />
        </section>

        <section id="sections" className="scroll-mt-20">
          <Suspense fallback={<SectionSkeleton />}>
            <SectionsTab businessId={businessId} business={business} isReadOnly={isReadOnly} />
          </Suspense>
        </section>

        <section id="content" className="scroll-mt-20">
          <Suspense fallback={<SectionSkeleton />}>
            <ContentTab businessId={businessId} business={business} isReadOnly={isReadOnly} />
          </Suspense>
        </section>

        <section id="services" className="scroll-mt-20">
          <Suspense fallback={<SectionSkeleton />}>
            <ServicesTab businessId={businessId} business={business} isReadOnly={isReadOnly} />
          </Suspense>
        </section>

        <section id="photos" className="scroll-mt-20">
          <Suspense fallback={<SectionSkeleton />}>
            <PhotosTab businessId={businessId} business={business} isReadOnly={isReadOnly} />
          </Suspense>
        </section>

        <section id="contact" className="scroll-mt-20">
          <Suspense fallback={<SectionSkeleton />}>
            <ContactTab businessId={businessId} business={business} isReadOnly={isReadOnly} />
          </Suspense>
        </section>

        <section id="seo" className="scroll-mt-20">
          <Suspense fallback={<SectionSkeleton />}>
            <SeoTab businessId={businessId} isReadOnly={isReadOnly} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
