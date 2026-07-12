import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBusinessById } from '@/lib/db/businesses';
import { BusinessForm } from '../../BusinessForm';
import { editBusinessAction } from '../../actions';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
}

export default async function EditBusinessPage({ params }: Props) {
  const { businessId } = await params;
  const business = await getBusinessById(businessId);
  if (!business) notFound();

  // Bind the businessId into the action via a closure-based wrapper.
  // We can't pass extra args through the form directly, so we bind server-side.
  const boundEditAction = editBusinessAction.bind(null, businessId);

  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400 mb-6">
        <Link href="/admin/businesses" className="hover:text-[--color-brand]">
          Businesses
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/admin/businesses/${businessId}`} className="hover:text-[--color-brand]">
          {business.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">Edit</span>
      </nav>

      <h1 className="text-xl font-semibold text-gray-900 mb-6">Edit business</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <BusinessForm
          action={boundEditAction}
          defaults={business}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
