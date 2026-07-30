import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { resolveStoredOrDefaultSections } from '@/lib/website-sections/resolve';
import { ContentTab } from './ContentTab';
import { ServicesTab } from './ServicesTab';
import { PhotosTab } from './PhotosTab';
import { SectionsTab } from './SectionsTab';
import { ContactTab } from './ContactTab';
import { SeoTab } from './SeoTab';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ tab?: string; error?: string; saved?: string }>;
}

const TABS = [
  { key: 'content', label: 'Content' },
  { key: 'services', label: 'Services' },
  { key: 'photos', label: 'Photos' },
  { key: 'sections', label: 'Sections' },
  { key: 'contact', label: 'Contact & CTAs' },
  { key: 'seo', label: 'SEO' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default async function WebsiteEditorPage({ params, searchParams }: Props) {
  const { businessId } = await params;
  const { tab, error, saved } = await searchParams;
  const session = await requireCustomerSession();
  const business = await requireBusinessOwnership(session.sub, businessId);
  const { mode } = await requireBusinessAccess(session.sub, businessId);

  if (mode === 'none') redirect(`/app/businesses/${businessId}`);
  const isReadOnly = mode === 'billing_recovery';

  const previews = await listPreviewsForBusiness(businessId);
  const latest = previews[0];
  const sections = resolveStoredOrDefaultSections(business.websiteSections);

  const activeTab: TabKey = (TABS.find((t) => t.key === tab)?.key ?? 'content') as TabKey;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Website</h1>
      <p className="mt-1 text-sm text-gray-500">Edit your website&apos;s content, photos, and layout.</p>

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

      <div className="mt-6 border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-1 min-w-max" aria-label="Website editor sections">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/app/businesses/${businessId}/website?tab=${t.key}`}
              className={`px-3.5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-(--color-brand) text-(--color-brand)'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'content' && <ContentTab businessId={businessId} content={latest?.content} isReadOnly={isReadOnly} />}
        {activeTab === 'services' && <ServicesTab businessId={businessId} content={latest?.content} isReadOnly={isReadOnly} />}
        {activeTab === 'photos' && <PhotosTab businessId={businessId} business={business} content={latest?.content} isReadOnly={isReadOnly} />}
        {activeTab === 'sections' && <SectionsTab businessId={businessId} sections={sections} business={business} isReadOnly={isReadOnly} />}
        {activeTab === 'contact' && <ContactTab businessId={businessId} business={business} content={latest?.content} isReadOnly={isReadOnly} />}
        {activeTab === 'seo' && <SeoTab businessId={businessId} content={latest?.content} isReadOnly={isReadOnly} />}
      </div>
    </div>
  );
}
