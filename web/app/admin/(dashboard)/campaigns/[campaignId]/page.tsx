import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCampaignById } from '@/lib/db/campaigns';
import { listCampaignRecipientsForCampaign } from '@/lib/db/campaign-recipients';
import { listRecentScanHitsForRecipient } from '@/lib/db/scan-hits';
import { listAllBusinesses } from '@/lib/db/businesses';
import { CampaignDetail } from './CampaignDetail';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ campaignId: string }>;
}

export default async function CampaignDetailPage({ params }: Props) {
  const { campaignId } = await params;

  const campaign = await getCampaignById(campaignId);
  if (!campaign) notFound();

  const [recipients, businesses] = await Promise.all([listCampaignRecipientsForCampaign(campaignId), listAllBusinesses()]);

  const recentScansByRecipient = Object.fromEntries(
    await Promise.all(
      recipients.map(async (recipient) => [recipient.campaignRecipientId, await listRecentScanHitsForRecipient(recipient.campaignRecipientId, 10)] as const),
    ),
  );

  return (
    <div className="p-8">
      <nav className="text-sm text-gray-400 mb-6">
        <Link href="/admin/campaigns" className="hover:text-(--color-brand)">
          Campaigns
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{campaign.name}</span>
      </nav>

      <CampaignDetail
        campaign={campaign}
        recipients={recipients}
        businesses={businesses.map((b) => ({ businessId: b.businessId, name: b.name, slug: b.slug }))}
        recentScansByRecipient={recentScansByRecipient}
      />
    </div>
  );
}
