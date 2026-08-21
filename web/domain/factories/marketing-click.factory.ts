import type { MarketingClick } from '@/domain/models/marketing-click';
import type { EmailSequence } from '@/domain/models/email-template';
import { MarketingClickSchema } from '@/domain/schemas/marketing-click.schema';
import { nowIso } from './utils';

export interface CreateMarketingClickInput {
  messageId: string;
  businessId: string;
  marketingCampaignId: string;
  emailSequence: EmailSequence;
  linkLabel: string;
  destinationUrl: string;
  userAgent?: string;
  ipHash?: string;
  referrer?: string;
}

export function createMarketingClick(input: CreateMarketingClickInput): MarketingClick {
  const now = nowIso();
  const sortKey = `CLICK#${now}#${crypto.randomUUID().slice(0, 8)}`;
  const record: MarketingClick = {
    messageId: input.messageId,
    sortKey,
    businessId: input.businessId,
    marketingCampaignId: input.marketingCampaignId,
    emailSequence: input.emailSequence,
    linkLabel: input.linkLabel,
    destinationUrl: input.destinationUrl,
    clickedAt: now,
    ...(input.userAgent !== undefined && { userAgent: input.userAgent }),
    ...(input.ipHash !== undefined && { ipHash: input.ipHash }),
    ...(input.referrer !== undefined && { referrer: input.referrer }),
    createdAt: now,
  };
  MarketingClickSchema.parse(record);
  return record;
}
