import Link from 'next/link';
import { NewCampaignForm } from './NewCampaignForm';

export default function NewCampaignPage() {
  return (
    <div className="p-8 max-w-xl">
      <nav className="text-sm text-gray-400 mb-6">
        <Link href="/admin/campaigns" className="hover:text-(--color-brand)">
          Campaigns
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">New</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">New campaign</h1>
        <p className="text-sm text-gray-400 mt-1">
          Add recipients (one for a manual test, or several) on the next page.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <NewCampaignForm />
      </div>
    </div>
  );
}
