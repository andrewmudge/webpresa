import type { MarketingMessage, MarketingMessageOutcome } from '@/domain/models/marketing-message';
import type { EmailSequence } from '@/domain/models/email-template';
import { MarketingMessageSchema } from '@/domain/schemas/marketing-message.schema';
import { generateId, nowIso } from './utils';

export function buildMarketingMessageSortKey(marketingCampaignId: string, emailSequence: EmailSequence): string {
  return `${marketingCampaignId}#${emailSequence}`;
}

export interface CreateMarketingMessageInput {
  businessId: string;
  marketingCampaignId: string;
  emailSequence: EmailSequence;
  outcome: MarketingMessageOutcome;
  skipReason?: string;
  failureReason?: string;
  subjectSnapshot?: string;
  htmlBodySnapshot?: string;
  textBodySnapshot?: string;
  sesMessageId?: string;
}

/**
 * Builds either a `'sent'` or a `'skipped'` `MarketingMessage` row — the
 * caller (`attemptSendForOutreach`, `lib/marketing/send.ts`) writes it via a
 * conditional `PutItem` on `sortKey` (`attribute_not_exists`), which is the
 * entire send-once/skip-once idempotency guarantee. `'failed'` outcomes are
 * deliberately never persisted here — see `MarketingMessage`'s doc comment
 * on why a failed SES call gets no row at all (cheap, safe to retry).
 */
export function createMarketingMessage(input: CreateMarketingMessageInput): MarketingMessage {
  const now = nowIso();
  const sortKey = buildMarketingMessageSortKey(input.marketingCampaignId, input.emailSequence);
  const record: MarketingMessage = {
    messageId: generateId('mktgmsg_'),
    businessId: input.businessId,
    marketingCampaignId: input.marketingCampaignId,
    emailSequence: input.emailSequence,
    sortKey,
    outcome: input.outcome,
    ...(input.skipReason !== undefined && { skipReason: input.skipReason }),
    ...(input.failureReason !== undefined && { failureReason: input.failureReason }),
    attemptedAt: now,
    ...(input.outcome === 'sent' && { sentAt: now }),
    ...(input.subjectSnapshot !== undefined && { subjectSnapshot: input.subjectSnapshot }),
    ...(input.htmlBodySnapshot !== undefined && { htmlBodySnapshot: input.htmlBodySnapshot }),
    ...(input.textBodySnapshot !== undefined && { textBodySnapshot: input.textBodySnapshot }),
    ...(input.sesMessageId !== undefined && { sesMessageId: input.sesMessageId }),
    clickCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  MarketingMessageSchema.parse(record);
  return record;
}
