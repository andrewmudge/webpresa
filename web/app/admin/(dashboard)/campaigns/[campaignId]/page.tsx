import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCampaignById } from '@/lib/db/campaigns';
import { listCampaignRecipientsForCampaign } from '@/lib/db/campaign-recipients';
import { listRecentScanHitsForRecipient } from '@/lib/db/scan-hits';
import { listAllBusinesses } from '@/lib/db/businesses';
import { listScanExecutionsForBusiness } from '@/lib/db/scan-executions';
import { getPostcardById } from '@/lib/db/postcards';
import { getLatestExistingSiteScreenshots } from '@/lib/screenshots/latest-existing-site-screenshot';
import { getLatestPreviewScreenshots } from '@/lib/screenshots/latest-preview-screenshot';
import { generateCampaignQrPng } from '@/lib/campaign/qr';
import { formatCampaignCodeForDisplay } from '@/lib/campaign/code-format';
import { getSignedAssetUrl } from '@/lib/s3/assets';
import { resolveAppBaseUrl } from '@/lib/env/app-base-url';
import { CampaignDetail, type RecipientPostcardAssets } from './CampaignDetail';

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

  const postcardsByRecipient = Object.fromEntries(
    await Promise.all(
      recipients
        .filter((r) => r.postcardId)
        .map(async (r) => [r.campaignRecipientId, await getPostcardById(r.postcardId!)] as const),
    ),
  );

  const businessById = new Map(businesses.map((b) => [b.businessId, b]));
  const appBaseUrl = resolveAppBaseUrl();

  // `Business.scanExecutionStatus` is never actually written by the scan
  // workflow (only `qualification`/`leadPriority`/`websiteQualityScore` are)
  // — the business detail page's own "Scan Workflow" card reads scan status
  // straight from `ScanExecution` records instead (`listScanExecutionsForBusiness`,
  // newest first), so this does the same rather than trusting that stale
  // field on `Business`.
  const uniqueBusinessIds = Array.from(new Set(recipients.map((r) => r.businessId)));
  const latestScanStatusByBusiness = Object.fromEntries(
    await Promise.all(
      uniqueBusinessIds.map(async (businessId) => {
        const executions = await listScanExecutionsForBusiness(businessId);
        return [businessId, executions[0]?.status] as const;
      }),
    ),
  );

  const postcardAssetsByRecipient = Object.fromEntries(
    await Promise.all(
      recipients
        .filter((r) => postcardsByRecipient[r.campaignRecipientId])
        .map(async (r) => {
          const business = businessById.get(r.businessId);
          const [beforeShots, afterShots, qrPng] = await Promise.all([
            getLatestExistingSiteScreenshots(r.businessId),
            getLatestPreviewScreenshots(r.businessId),
            generateCampaignQrPng(r.campaignCode, appBaseUrl),
          ]);
          const postcard = postcardsByRecipient[r.campaignRecipientId];
          const frontUrl = postcard?.frontArtifactKey ? await getSignedAssetUrl(postcard.frontArtifactKey) : undefined;

          const assets: RecipientPostcardAssets = {
            businessName: business?.name ?? r.businessId,
            beforeScreenshotSrc: beforeShots.desktopSrc,
            afterDesktopScreenshotSrc: afterShots.desktopSrc,
            afterMobileScreenshotSrc: afterShots.mobileSrc,
            qrDataUri: `data:image/png;base64,${qrPng.toString('base64')}`,
            accessCodeDisplay: formatCampaignCodeForDisplay(r.campaignCode),
            frontUrl,
          };
          return [r.campaignRecipientId, assets] as const;
        }),
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
        businesses={businesses.map((b) => ({
          businessId: b.businessId,
          name: b.name,
          slug: b.slug,
          qualification: b.qualification,
          leadPriority: b.leadPriority,
          websiteQualityScore: b.websiteQualityScore,
          currentPreviewId: b.currentPreviewId,
        }))}
        recentScansByRecipient={recentScansByRecipient}
        postcardsByRecipient={postcardsByRecipient}
        postcardAssetsByRecipient={postcardAssetsByRecipient}
        latestScanStatusByBusiness={latestScanStatusByBusiness}
      />
    </div>
  );
}
