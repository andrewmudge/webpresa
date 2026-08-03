import Link from 'next/link';
import { listAllCampaigns } from '@/lib/db/campaigns';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  const campaigns = await listAllCampaigns();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-0.5">{campaigns.length} total</p>
        </div>
        <Link
          href="/admin/campaigns/new"
          className="inline-flex items-center gap-2 rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
        >
          + New campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">No campaigns yet</p>
          <Link href="/admin/campaigns/new" className="text-sm text-(--color-brand) hover:underline">
            Create the first campaign →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-(--color-border) bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((campaign) => (
                <tr key={campaign.campaignId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/campaigns/${campaign.campaignId}`} className="font-medium text-(--color-brand) hover:underline">
                      {campaign.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{campaign.channel}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{campaign.status}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(campaign.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
