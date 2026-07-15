import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBusinessById } from '@/lib/db/businesses';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { SectionConfigForm } from '../../SectionConfigForm';
import { saveWebsiteSectionsAction } from '../../actions';
import { resolveStoredOrDefaultSections } from '@/lib/website-sections/resolve';
import { computeSectionAvailability, hasResolvableCta } from '@/lib/website-sections/availability';
import { recommendWebsiteSections } from '@/lib/website-sections/recommend';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
}

export default async function OnboardingSectionsPage({ params }: Props) {
  const { businessId } = await params;
  const [business, previews] = await Promise.all([
    getBusinessById(businessId),
    listPreviewsForBusiness(businessId).catch(() => []),
  ]);
  if (!business) notFound();

  const latestContent = previews[0]?.content;
  const availability = computeSectionAvailability({
    business,
    content: latestContent,
    hasCta: hasResolvableCta(business, latestContent),
  });

  // First time through onboarding (no stored config yet): pre-fill with the
  // deterministic recommendation rather than plain catalog defaults, since
  // photos were likely just uploaded in step 2 — the admin can still
  // override anything before finishing.
  const sections = business.websiteSections
    ? resolveStoredOrDefaultSections(business.websiteSections)
    : recommendWebsiteSections({
        business,
        content: latestContent,
        hasCta: hasResolvableCta(business, latestContent),
      }).sections;

  return (
    <div className="p-8 max-w-3xl">
      <nav className="text-sm text-gray-400 mb-6">
        <Link href="/admin/businesses" className="hover:text-(--color-brand)">
          Businesses
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700 truncate max-w-xs inline-block">{business.name}</span>
      </nav>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-(--color-brand) uppercase tracking-wide mb-1">Step 3 of 3</p>
          <h1 className="text-xl font-semibold text-gray-900">Choose website sections</h1>
          <p className="text-sm text-gray-400 mt-1">
            Pre-selected based on what you&apos;ve entered so far. Required sections always render.
          </p>
        </div>
        <Link
          href={`/admin/businesses/${businessId}`}
          className="text-sm text-gray-400 hover:text-(--color-brand) transition-colors shrink-0 mt-1"
        >
          Skip — use these →
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <SectionConfigForm
          action={saveWebsiteSectionsAction.bind(null, businessId)}
          sections={sections}
          availability={availability}
          submitLabel="Finish setup →"
        />
      </div>
    </div>
  );
}
