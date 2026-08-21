import 'server-only';
import type { Postcard } from '@/domain/models/postcard';
import { createMarketingOutreach } from '@/domain/factories/marketing-outreach.factory';
import { getMarketingOutreach, putMarketingOutreachIfNotExists } from '@/lib/db/marketing-outreach';
import { log } from '@/lib/logging/log';
import { MARKETING_CAMPAIGN_ID } from './constants';
import { ensureMarketingCampaignExists } from './campaign';
import { checkMarketingEligibility } from './eligibility';
import { computeNextActionAt } from './schedule';

/**
 * Called from the Lob webhook route (`app/api/webhooks/lob/route.ts`) once
 * a postcard's `deliveredAt` is newly recorded — idempotently enrolls the
 * business in the Postcard Follow-Up campaign and schedules Email 1.
 *
 * No retroactive backfill: a postcard delivered while the campaign is
 * disabled never auto-enrolls later, even after an admin re-enables it —
 * enrollment is a pure function of the delivery event, not a reconciliation
 * sweep (see `implementation.md`, Marketing stage, "Existing Lob webhook
 * integration").
 */
export async function startMarketingOutreach(
  businessId: string,
  postcard: Pick<Postcard, 'postcardId' | 'campaignRecipientId' | 'deliveredAt'>,
): Promise<void> {
  const { deliveredAt } = postcard;
  if (!deliveredAt) return;

  // Already enrolled — the Lob webhook's own event dedup should already
  // prevent a second call here, but stay idempotent regardless (cheap
  // insurance against a future second delivery-mapped event type).
  const existing = await getMarketingOutreach(businessId, MARKETING_CAMPAIGN_ID);
  if (existing) return;

  const campaign = await ensureMarketingCampaignExists();
  if (campaign.status !== 'enabled') return;

  // Run the shared eligibility check once at enrollment too, so a business
  // already claimed/converted between mailing and delivery is never
  // enrolled at all.
  const eligibility = await checkMarketingEligibility({
    businessId,
    status: 'active',
    campaignRecipientId: postcard.campaignRecipientId,
  });
  if (!eligibility.eligible) {
    log({
      event: 'marketing.outreach.enrollment_skipped',
      component: 'marketing',
      businessId,
      postcardId: postcard.postcardId,
      marketingCampaignId: MARKETING_CAMPAIGN_ID,
      status: eligibility.reason,
    });
    return;
  }

  const outreach = createMarketingOutreach({
    businessId,
    marketingCampaignId: MARKETING_CAMPAIGN_ID,
    postcardId: postcard.postcardId,
    ...(postcard.campaignRecipientId !== undefined && { campaignRecipientId: postcard.campaignRecipientId }),
    deliveredAt,
    nextActionAt: computeNextActionAt(deliveredAt, 1),
  });

  const created = await putMarketingOutreachIfNotExists(outreach);
  if (created) {
    log({
      event: 'marketing.outreach.enrolled',
      component: 'marketing',
      businessId,
      postcardId: postcard.postcardId,
      marketingCampaignId: MARKETING_CAMPAIGN_ID,
    });
  }
}
