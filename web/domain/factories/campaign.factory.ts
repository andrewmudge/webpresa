import type { Campaign, CampaignChannel } from '@/domain/models/campaign';
import { CampaignSchema } from '@/domain/schemas/campaign.schema';
import { generateId, nowIso } from './utils';

export interface CreateCampaignInput {
  name: string;
  channel: CampaignChannel;
}

/** Create a new Campaign record in `'active'` status. */
export function createCampaign(input: CreateCampaignInput): Campaign {
  const now = nowIso();

  const record: Campaign = {
    campaignId: generateId('campaign_'),
    name: input.name,
    channel: input.channel,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  CampaignSchema.parse(record);
  return record;
}
