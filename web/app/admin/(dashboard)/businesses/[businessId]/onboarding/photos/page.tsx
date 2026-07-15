import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBusinessById } from '@/lib/db/businesses';
import { PhotosForm } from '../../../PhotosForm';
import { updatePhotosAction } from '../../actions';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
}

export default async function OnboardingPhotosPage({ params }: Props) {
  const { businessId } = await params;
  const business = await getBusinessById(businessId);
  if (!business) notFound();

  const boundAction = updatePhotosAction.bind(null, businessId, `/admin/businesses/${businessId}/onboarding/sections`);

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
          href={`/admin/businesses/${businessId}/onboarding/sections`}
          className="text-sm text-gray-400 hover:text-(--color-brand) transition-colors shrink-0 mt-1"
        >
          Skip for now →
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <PhotosForm action={boundAction} defaults={business} submitLabel="Continue →" />
      </div>
    </div>
  );
}
