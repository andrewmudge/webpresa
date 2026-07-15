import Link from 'next/link';
import { BusinessDetailsForm } from '../BusinessDetailsForm';
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

      <div className="mb-6">
        <p className="text-xs font-semibold text-(--color-brand) uppercase tracking-wide mb-1">Step 1 of 3</p>
        <h1 className="text-xl font-semibold text-gray-900">Business details</h1>
        <p className="text-sm text-gray-400 mt-1">Next you&apos;ll upload photos, then choose which website sections to show.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <BusinessDetailsForm action={createBusinessAction} submitLabel="Continue →" />
      </div>
    </div>
  );
}
