import type { MarketingCampaign } from '@/domain/models/marketing-campaign';
import { MarketingCampaignSchema } from '@/domain/schemas/marketing-campaign.schema';
import { MARKETING_CAMPAIGN_ID, MARKETING_CAMPAIGN_NAME } from '@/lib/marketing/constants';
import { nowIso } from './utils';

/**
 * Builds the MVP's single campaign row, always `'disabled'` — an admin must
 * explicitly enable it in every environment, including production. Called
 * only by `ensureMarketingCampaignExists()` (`lib/marketing/campaign.ts`)
 * the first time no row exists yet.
 */
export function createMarketingCampaign(): MarketingCampaign {
  const now = nowIso();
  const record: MarketingCampaign = {
    marketingCampaignId: MARKETING_CAMPAIGN_ID,
    name: MARKETING_CAMPAIGN_NAME,
    status: 'disabled',
    createdAt: now,
    updatedAt: now,
  };
  MarketingCampaignSchema.parse(record);
  return record;
}
