import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCampaignById } from '@/lib/db/campaigns';
import { CampaignDiscoverPanel } from './CampaignDiscoverPanel';

interface Props {
  params: Promise<{ campaignId: string }>;
}

export default async function CampaignDiscoverPage({ params }: Props) {
  const { campaignId } = await params;

  const campaign = await getCampaignById(campaignId);
  if (!campaign) notFound();

  return (
    <div className="p-8 max-w-5xl">
      <nav className="mb-6 text-sm text-gray-400">
        <Link href="/admin/campaigns" className="hover:text-(--color-brand)">
          Campaigns
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{campaign.name}</span>
        <span className="mx-2">/</span>
        <span className="text-gray-700">Discover</span>
      </nav>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Discover businesses for &ldquo;{campaign.name}&rdquo;</h1>
          <p className="text-sm text-gray-500 mt-1">
            Search by industry and location, select businesses to import, and repeat with as many searches as you
            need — your selections carry over between searches.
          </p>
        </div>
        <Link href={`/admin/campaigns/${campaign.campaignId}`} className="shrink-0 text-sm text-(--color-brand) hover:underline">
          Skip to campaign →
        </Link>
      </div>

      <CampaignDiscoverPanel campaignId={campaign.campaignId} />
    </div>
  );
}
