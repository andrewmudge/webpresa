import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBusinessById } from '@/lib/db/businesses';
import { listAllStockImages } from '@/lib/db/stock-images';
import { describeHeroDimensionWarningsForPhotos } from '@/lib/image/hero-dimensions';
import { PhotosForm } from '../../../PhotosForm';
import { updatePhotosAction, addBusinessPhotosAction, deleteBusinessPhotoAction, updateBusinessLogoAction } from '../../actions';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
}

export default async function OnboardingPhotosPage({ params }: Props) {
  const { businessId } = await params;
  const business = await getBusinessById(businessId);
  if (!business) notFound();

  const photosPageUrl = `/admin/businesses/${businessId}/onboarding/photos`;
  const sectionsPageUrl = `/admin/businesses/${businessId}/onboarding/sections`;

  // Once photos exist, the Photo Assignment section below becomes visible
  // (see PhotosForm) — only then does the submit button advance to step 3.
  // Before that, submitting redirects back to this same page so the newly
  // uploaded photos and the assignment UI actually show up before moving on.
  const hasPhotos = (business.photoUrls?.length ?? 0) > 0;
  const redirectTarget = hasPhotos ? sectionsPageUrl : photosPageUrl;
  const boundAction = updatePhotosAction.bind(null, businessId, redirectTarget);
  const submitLabel = hasPhotos ? 'Continue →' : 'Upload Photos';

  const heroPhotoWarnings = await describeHeroDimensionWarningsForPhotos(business.photoUrls ?? []);
  const stockImages = (await listAllStockImages()).filter((img) => img.status === 'active');

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
          <p className="text-xs font-semibold text-(--color-brand) uppercase tracking-wide mb-1">Step 2 of 3</p>
          <h1 className="text-xl font-semibold text-gray-900">Upload photos</h1>
          <p className="text-sm text-gray-400 mt-1">Optional — a logo and a few photos make for a stronger generated website.</p>
        </div>
        <Link
          href={sectionsPageUrl}
          className="text-sm text-gray-400 hover:text-(--color-brand) transition-colors shrink-0 mt-1"
        >
          Skip for now →
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <PhotosForm
          action={boundAction}
          addPhotosAction={addBusinessPhotosAction.bind(null, businessId)}
          deletePhotoAction={deleteBusinessPhotoAction.bind(null, businessId)}
          updateLogoAction={updateBusinessLogoAction.bind(null, businessId)}
          defaults={business}
          submitLabel={submitLabel}
          heroPhotoWarnings={heroPhotoWarnings}
          stockImages={stockImages}
        />
      </div>
    </div>
  );
}
