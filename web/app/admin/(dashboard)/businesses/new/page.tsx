import Link from 'next/link';
import { BusinessForm } from '../BusinessForm';
import { createBusinessAction } from '../actions';

export default function NewBusinessPage() {
  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400 mb-6">
        <Link href="/admin/businesses" className="hover:text-(--color-brand)">
          Businesses
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">New</span>
      </nav>

      <h1 className="text-xl font-semibold text-gray-900 mb-6">Add business</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <BusinessForm action={createBusinessAction} submitLabel="Create business" />
      </div>
    </div>
  );
}
