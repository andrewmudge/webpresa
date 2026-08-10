'use server';
import { getSession } from '@/lib/auth/session';
import { getBusinessById, updateBusiness } from '@/lib/db/businesses';
import { getCampaignRecipientById } from '@/lib/db/campaign-recipients';
import { getScanExecutionById } from '@/lib/db/scan-executions';
import { listPreviewsForBusiness, publishSitePreview } from '@/lib/db/site-previews';
import { createPostcardAction } from '../../postcards/actions';

/**
 * Bulk "Add Selected Businesses" step (Stage 21 redesign) — for every still-
 * included recipient, publishes that business's latest generated preview
 * (if it isn't already published) using the same underlying `publishSitePreview`
 * + `updateBusiness` pair the single-business `publishPreviewAction` uses
 * (not that redirect-bound action itself), then generates the postcard via
 * the existing, unmodified `createPostcardAction`. Idempotent — safe to
 * re-run over recipients that already have a postcard.
 */

export interface PublishAndGenerateFailure {
  businessId: string;
  businessName: string;
  reason: string;
}

export interface PublishAndGenerateSummary {
  published: number;
  alreadyPublished: number;
  postcardsGenerated: number;
  alreadyHadPostcard: number;
  failed: PublishAndGenerateFailure[];
}

async function resolvePreviewIdToPublish(businessId: string, latestScanExecutionId?: string): Promise<string | null> {
  if (latestScanExecutionId) {
    const execution = await getScanExecutionById(latestScanExecutionId);
    if (execution?.previewId) return execution.previewId;
  }
  const previews = await listPreviewsForBusiness(businessId);
  const newest = previews.find((p) => p.status !== 'archived');
  return newest?.previewId ?? null;
}

export async function publishAndGeneratePostcardsAction(
  campaignId: string,
  campaignRecipientIds: string[],
): Promise<PublishAndGenerateSummary> {
  const session = await getSession();
  const summary: PublishAndGenerateSummary = { published: 0, alreadyPublished: 0, postcardsGenerated: 0, alreadyHadPostcard: 0, failed: [] };
  if (!session) return summary;

  for (const campaignRecipientId of campaignRecipientIds) {
    const recipient = await getCampaignRecipientById(campaignRecipientId);
    if (!recipient || recipient.campaignId !== campaignId) {
      summary.failed.push({ businessId: recipient?.businessId ?? '—', businessName: '—', reason: 'Recipient not found in this campaign.' });
      continue;
    }

    if (recipient.postcardId) {
      summary.alreadyHadPostcard += 1;
      continue;
    }

    const business = await getBusinessById(recipient.businessId);
    if (!business) {
      summary.failed.push({ businessId: recipient.businessId, businessName: '—', reason: 'Business not found.' });
      continue;
    }

    if (!business.currentPreviewId) {
      const previewId = await resolvePreviewIdToPublish(business.businessId, business.latestScanExecutionId);
      if (!previewId) {
        summary.failed.push({ businessId: business.businessId, businessName: business.name, reason: 'No generated website preview yet.' });
        continue;
      }
      const published = await publishSitePreview(previewId);
      if (!published) {
        summary.failed.push({ businessId: business.businessId, businessName: business.name, reason: 'Could not publish website preview.' });
        continue;
      }
      await updateBusiness(business.businessId, { currentPreviewId: published.previewId });
      summary.published += 1;
    } else {
      summary.alreadyPublished += 1;
    }

    const postcardResult = await createPostcardAction(campaignRecipientId);
    if (postcardResult.error) {
      summary.failed.push({ businessId: business.businessId, businessName: business.name, reason: postcardResult.error });
      continue;
    }
    summary.postcardsGenerated += 1;
    if (postcardResult.renderWarning) {
      summary.failed.push({ businessId: business.businessId, businessName: business.name, reason: `Postcard created but render failed: ${postcardResult.renderWarning}` });
    }
  }

  return summary;
}
