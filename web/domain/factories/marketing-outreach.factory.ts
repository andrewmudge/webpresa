import type { MarketingOutreach } from '@/domain/models/marketing-outreach';
import { MarketingOutreachSchema } from '@/domain/schemas/marketing-outreach.schema';
import { nowIso } from './utils';

/** 256 bits of entropy — two concatenated `crypto.randomUUID()`s, hyphens stripped. Plenty for a token that only needs to resist guessing, not cryptographic signing (see `MarketingOutreach.unsubscribeToken`'s doc comment). */
function generateUnsubscribeToken(): string {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
}

export interface CreateMarketingOutreachInput {
  businessId: string;
  marketingCampaignId: string;
  postcardId: string;
  campaignRecipientId?: string;
  /** `Postcard.deliveredAt` — the scheduling anchor. */
  deliveredAt: string;
  /** Email 1's due timestamp — `computeNextActionAt(deliveredAt, 1)`, computed by the caller (`lib/marketing/schedule.ts`) so this factory stays a pure data-shaping function. */
  nextActionAt: string;
}

/**
 * Builds a fresh enrollment, ready to send Email 1. `unsubscribeToken` is
 * generated fresh here and reused unchanged for all 3 emails — see
 * `MarketingOutreach`'s doc comment for why it's plaintext, not hashed.
 */
export function createMarketingOutreach(input: CreateMarketingOutreachInput): MarketingOutreach {
  const now = nowIso();
  const record: MarketingOutreach = {
    businessId: input.businessId,
    marketingCampaignId: input.marketingCampaignId,
    postcardId: input.postcardId,
    ...(input.campaignRecipientId !== undefined && { campaignRecipientId: input.campaignRecipientId }),
    deliveredAt: input.deliveredAt,
    status: 'active',
    currentSequence: 0,
    nextActionSequence: 1,
    nextActionAt: input.nextActionAt,
    sendAttemptCount: 0,
    unsubscribeToken: generateUnsubscribeToken(),
    createdAt: now,
    updatedAt: now,
  };
  MarketingOutreachSchema.parse(record);
  return record;
}
