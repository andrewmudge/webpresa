import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPostcardById } from '@/lib/db/postcards';
import { getBusinessById } from '@/lib/db/businesses';
import { getCampaignRecipientById } from '@/lib/db/campaign-recipients';
import { getLatestExistingSiteScreenshots } from '@/lib/screenshots/latest-existing-site-screenshot';
import { getLatestPreviewScreenshots } from '@/lib/screenshots/latest-preview-screenshot';
import { resolvePostcardTemplateVariant } from '@/lib/postcards/template';
import { generateCampaignQrPng } from '@/lib/campaign/qr';
import { formatCampaignCodeForDisplay } from '@/lib/campaign/code-format';
import { resolveAppBaseUrl } from '@/lib/env/app-base-url';
import { isLobLiveMode } from '@/lib/lob/client';
import PostcardFront from '../components/PostcardFront';
import PostcardBack from '../components/PostcardBack';
import PostcardZoom from '../components/PostcardZoom';
import ApproveButton from './ApproveButton';
import SubmitButton from './SubmitButton';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ postcardId: string }>;
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className={ok ? 'text-green-600' : 'text-red-600'}>{ok ? '✓' : '✗'}</span>
      <span className={ok ? 'text-gray-700' : 'text-red-700'}>{label}</span>
    </li>
  );
}

export default async function PostcardDetailPage({ params }: Props) {
  const { postcardId } = await params;

  const postcard = await getPostcardById(postcardId);
  if (!postcard) notFound();

  const business = await getBusinessById(postcard.businessId);
  if (!business) notFound();

  const [recipient, beforeShots, afterShots] = await Promise.all([
    postcard.campaignRecipientId ? getCampaignRecipientById(postcard.campaignRecipientId) : Promise.resolve(null),
    getLatestExistingSiteScreenshots(postcard.businessId),
    getLatestPreviewScreenshots(postcard.businessId),
  ]);

  let qrDataUri: string | undefined;
  let accessCodeDisplay: string | undefined;
  if (recipient) {
    const png = await generateCampaignQrPng(recipient.campaignCode, resolveAppBaseUrl());
    qrDataUri = `data:image/png;base64,${png.toString('base64')}`;
    accessCodeDisplay = formatCampaignCodeForDisplay(recipient.campaignCode);
  }

  const isLiveMode = await isLobLiveMode();

  return (
    <div className="p-8">
      <nav className="mb-6 text-sm text-gray-400">
        <Link href="/admin/postcards" className="hover:text-(--color-brand)">
          Postcards
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{business.name}</span>
      </nav>

      <div className="grid max-w-5xl gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h1 className="text-xl font-semibold text-gray-900">
            <Link href={`/admin/businesses/${business.businessId}`} className="hover:underline hover:text-(--color-brand)">
              {business.name}
            </Link>
          </h1>
          <p className="text-sm text-gray-500">
            {postcard.provider.toUpperCase()} · <span className="capitalize">{postcard.status}</span>
          </p>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Front — click to enlarge</p>
            <PostcardZoom label="Front">
              <PostcardFront
                businessName={business.name}
                templateVariant={resolvePostcardTemplateVariant(business)}
                beforeScreenshotSrc={beforeShots.desktopSrc}
                afterDesktopScreenshotSrc={afterShots.desktopSrc}
                afterMobileScreenshotSrc={afterShots.mobileSrc}
                qrDataUri={qrDataUri}
                accessCodeDisplay={accessCodeDisplay}
              />
            </PostcardZoom>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Back — click to enlarge</p>
            <PostcardZoom label="Back">
              <PostcardBack
                recipientName={business.name}
                recipientAddress={business.address}
                qrDataUri={qrDataUri}
                accessCodeDisplay={accessCodeDisplay}
              />
            </PostcardZoom>
          </div>

          <p className="text-xs text-gray-400">
            This preview renders live from current data, not by reading back the stored PDF artifact — but both use the exact same
            `PostcardFront`/`PostcardBack` components, so what you see here matches what was (or will be) submitted to Lob.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-(--color-border) bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Administrative review</h3>
            <ul className="space-y-2">
              <ChecklistItem ok={business.qualification !== 'reject'} label={`Business qualification: ${business.qualification ?? 'not scored'}`} />
              <ChecklistItem ok={Boolean(business.address)} label={business.address ? 'Mailing address on file' : 'No mailing address on file'} />
              <ChecklistItem
                ok={Boolean(afterShots.desktopSrc)}
                label={afterShots.desktopSrc ? 'Generated website preview captured' : 'No generated website preview screenshot yet'}
              />
              <ChecklistItem
                ok={Boolean(beforeShots.desktopSrc)}
                label={beforeShots.desktopSrc ? 'Existing-site screenshot captured' : 'No existing-site screenshot yet'}
              />
              <ChecklistItem ok={Boolean(recipient)} label={recipient ? `QR destination: /r/${recipient.campaignCode}` : 'No CampaignRecipient — no QR destination'} />
              <ChecklistItem
                ok={Boolean(postcard.frontArtifactKey && postcard.backArtifactKey)}
                label={postcard.frontArtifactKey && postcard.backArtifactKey ? `Rendered artifact stored (${postcard.renderedAt})` : 'No rendered artifact yet'}
              />
              <ChecklistItem
                ok={typeof postcard.costCents === 'number'}
                label={
                  typeof postcard.costCents === 'number'
                    ? `Cost: $${(postcard.costCents / 100).toFixed(2)}`
                    : 'Cost unknown until submitted — Lob exposes no pre-submission cost/dry-run endpoint'
                }
              />
            </ul>
          </div>

          <div className="rounded-xl border border-(--color-border) bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Approval</h3>
            <ApproveButton postcardId={postcard.postcardId} reviewedAt={postcard.reviewedAt} reviewedBy={postcard.reviewedBy} />
          </div>

          <div className="rounded-xl border border-(--color-border) bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Submission</h3>
            <SubmitButton
              postcardId={postcard.postcardId}
              status={postcard.status}
              reviewedAt={postcard.reviewedAt}
              providerPostcardId={postcard.providerPostcardId}
              failureReason={postcard.failureReason}
              isLiveMode={isLiveMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
