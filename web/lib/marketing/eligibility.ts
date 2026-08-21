import 'server-only';
import type { MarketingOutreach } from '@/domain/models/marketing-outreach';
import type { MarketingSuppressionReason } from '@/domain/models/marketing-suppression';
import { ensureMarketingCampaignExists } from './campaign';
import { getMarketingSuppression } from '@/lib/db/marketing-suppressions';
import { getBusinessById } from '@/lib/db/businesses';
import { getCampaignRecipientById } from '@/lib/db/campaign-recipients';

export type MarketingIneligibilityReason =
  | 'campaign_disabled'
  | 'outreach_not_active'
  | 'business_not_found'
  | 'business_claimed'
  | 'business_customer'
  | 'no_email_address'
  | 'suppressed'
  | 'postcard_engaged';

export type MarketingEligibilityResult =
  | { eligible: true; targetEmail: string }
  | { eligible: false; reason: MarketingIneligibilityReason; suppressionReason?: MarketingSuppressionReason };

/**
 * The single source of truth for "may this business receive its next
 * marketing email right now" — called fresh immediately before every send:
 * the Lob-delivery enrollment hook, the daily cron sweep, and the manual
 * "send now" admin action all call this exact function (see
 * `implementation.md`, Marketing stage, "Send-time eligibility check" —
 * NEVER assume a schedule set days ago is still valid). Checks, in order:
 *
 *  1. Campaign enabled (the global kill switch).
 *  2. Outreach still `'active'` (not already paused/suppressed/cancelled/
 *     completed/failed).
 *  3. Business exists and hasn't been claimed or become a paying customer.
 *     `'cancelled'` business status is deliberately NOT a stop condition —
 *     it isn't in the spec's explicit stop-condition list, and a former
 *     customer may legitimately still be worth re-marketing to.
 *  4. `MarketingSuppression` by target email — unifies unsubscribed/
 *     hard-bounced/complained/admin-suppressed into one lookup.
 *  5. Postcard engagement — reads `CampaignRecipient.totalScans` directly
 *     (Stage 21's own model), never a duplicated flag.
 *
 * All I/O is bounded single-item lookups — no scans.
 */
export async function checkMarketingEligibility(
  outreach: Pick<MarketingOutreach, 'businessId' | 'status' | 'campaignRecipientId'>,
): Promise<MarketingEligibilityResult> {
  const campaign = await ensureMarketingCampaignExists();
  if (campaign.status !== 'enabled') return { eligible: false, reason: 'campaign_disabled' };

  if (outreach.status !== 'active') return { eligible: false, reason: 'outreach_not_active' };

  const business = await getBusinessById(outreach.businessId);
  if (!business) return { eligible: false, reason: 'business_not_found' };
  if (business.status === 'claimed') return { eligible: false, reason: 'business_claimed' };
  if (business.status === 'customer') return { eligible: false, reason: 'business_customer' };

  const targetEmail = business.leadNotificationEmail ?? business.email;
  if (!targetEmail) return { eligible: false, reason: 'no_email_address' };

  const suppression = await getMarketingSuppression(targetEmail.trim().toLowerCase());
  if (suppression) return { eligible: false, reason: 'suppressed', suppressionReason: suppression.reason };

  if (outreach.campaignRecipientId) {
    const recipient = await getCampaignRecipientById(outreach.campaignRecipientId);
    if (recipient && recipient.totalScans > 0) return { eligible: false, reason: 'postcard_engaged' };
  }

  return { eligible: true, targetEmail };
}
