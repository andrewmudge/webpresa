import 'server-only';
import type { MarketingOutreach } from '@/domain/models/marketing-outreach';
import type { EmailSequence } from '@/domain/models/email-template';
import { createMarketingMessage } from '@/domain/factories/marketing-message.factory';
import { putMarketingMessageIfNotExists } from '@/lib/db/marketing-messages';
import {
  recordOutreachSendSucceeded,
  recordOutreachSendFailed,
  transitionOutreachToTerminal,
} from '@/lib/db/marketing-outreach';
import { getEmailTemplate } from '@/lib/db/marketing-email-templates';
import { getBusinessById } from '@/lib/db/businesses';
import { sendMarketingCampaignEmail } from '@/lib/ses/send-marketing-email';
import { log } from '@/lib/logging/log';
import { checkMarketingEligibility, type MarketingIneligibilityReason } from './eligibility';
import { renderTemplate } from './render-template';
import { computeNextActionAt } from './schedule';
import { isNonProdRecipientAllowed } from './test-recipient-allowlist';

/** Mirrors `MAX_NOTIFICATION_ATTEMPTS` in `app/api/internal/leads/retry-notifications/route.ts`. */
const MAX_SEND_ATTEMPTS = 3;
const RETRY_BACKOFF_HOURS = 6;

/** Reasons that mean "not right now" rather than "never" — the outreach is left exactly as-is (still `'active'`, `nextActionAt` untouched) so the next cron pass re-evaluates fresh once the underlying condition changes. No `MarketingMessage` row is written for these — they aren't a real send attempt against this step. */
const RETRYABLE_INELIGIBILITY_REASONS: MarketingIneligibilityReason[] = ['campaign_disabled', 'outreach_not_active'];

function terminalStatusForReason(reason: MarketingIneligibilityReason): { status: 'suppressed' | 'completed'; lastEventType: string } {
  switch (reason) {
    case 'business_claimed':
      return { status: 'completed', lastEventType: 'stopped_claimed' };
    case 'business_customer':
      return { status: 'completed', lastEventType: 'stopped_customer' };
    case 'postcard_engaged':
      return { status: 'completed', lastEventType: 'engaged' };
    case 'suppressed':
      return { status: 'suppressed', lastEventType: 'suppressed' };
    case 'business_not_found':
    case 'no_email_address':
    default:
      return { status: 'completed', lastEventType: reason };
  }
}

export type AttemptSendOutcome =
  | { outcome: 'sent'; messageId: string; sesMessageId: string; emailSequence: EmailSequence }
  | { outcome: 'skipped'; reason: string }
  | { outcome: 'failed'; error: string; willRetry: boolean };

/**
 * Attempts to send the next due step for one outreach — the single
 * function called by both the daily cron sweep
 * (`app/api/internal/marketing/send-due-emails/route.ts`) and the manual
 * "Send Next Email Now" admin action. Always re-checks eligibility fresh
 * (never trusts `nextActionAt` alone — see `implementation.md`, Marketing
 * stage, "Send-time eligibility check").
 */
export async function attemptSendForOutreach(outreach: MarketingOutreach): Promise<AttemptSendOutcome> {
  const emailSequence = outreach.nextActionSequence;
  if (!emailSequence) {
    log({
      level: 'error',
      event: 'marketing.email.inconsistent_state',
      component: 'marketing',
      businessId: outreach.businessId,
      marketingCampaignId: outreach.marketingCampaignId,
      message: 'due outreach has no nextActionSequence',
    });
    return { outcome: 'skipped', reason: 'inconsistent_state' };
  }

  const eligibility = await checkMarketingEligibility(outreach);

  if (!eligibility.eligible) {
    if (RETRYABLE_INELIGIBILITY_REASONS.includes(eligibility.reason)) {
      log({
        event: 'marketing.email.deferred',
        component: 'marketing',
        businessId: outreach.businessId,
        marketingCampaignId: outreach.marketingCampaignId,
        emailSequence,
        status: eligibility.reason,
      });
      return { outcome: 'skipped', reason: eligibility.reason };
    }

    const { status, lastEventType } = terminalStatusForReason(eligibility.reason);
    const skipMessage = createMarketingMessage({
      businessId: outreach.businessId,
      marketingCampaignId: outreach.marketingCampaignId,
      emailSequence,
      outcome: 'skipped',
      skipReason: eligibility.reason,
    });
    await putMarketingMessageIfNotExists(skipMessage);
    await transitionOutreachToTerminal({
      businessId: outreach.businessId,
      marketingCampaignId: outreach.marketingCampaignId,
      status,
      ...(eligibility.suppressionReason !== undefined && { suppressionReason: eligibility.suppressionReason }),
      lastEventType,
    });
    log({
      event: 'marketing.email.skipped',
      component: 'marketing',
      businessId: outreach.businessId,
      marketingCampaignId: outreach.marketingCampaignId,
      emailSequence,
      status: eligibility.reason,
    });
    return { outcome: 'skipped', reason: eligibility.reason };
  }

  const business = await getBusinessById(outreach.businessId);
  if (!business) {
    // Eligibility just confirmed the business exists — this can only be a
    // race with a concurrent deletion. Treat as a deferred retry rather
    // than a hard failure.
    return { outcome: 'skipped', reason: 'business_not_found' };
  }

  if (!isNonProdRecipientAllowed(eligibility.targetEmail)) {
    const skipMessage = createMarketingMessage({
      businessId: outreach.businessId,
      marketingCampaignId: outreach.marketingCampaignId,
      emailSequence,
      outcome: 'skipped',
      skipReason: 'non_prod_recipient_not_allowlisted',
    });
    await putMarketingMessageIfNotExists(skipMessage);
    log({
      event: 'marketing.email.skipped',
      component: 'marketing',
      businessId: outreach.businessId,
      marketingCampaignId: outreach.marketingCampaignId,
      emailSequence,
      status: 'non_prod_recipient_not_allowlisted',
    });
    return { outcome: 'skipped', reason: 'non_prod_recipient_not_allowlisted' };
  }

  const template = await getEmailTemplate(outreach.marketingCampaignId, emailSequence);
  if (!template) {
    log({
      level: 'error',
      event: 'marketing.email.template_missing',
      component: 'marketing',
      businessId: outreach.businessId,
      marketingCampaignId: outreach.marketingCampaignId,
      emailSequence,
    });
    return { outcome: 'skipped', reason: 'template_missing' };
  }

  const preSendMessage = createMarketingMessage({
    businessId: outreach.businessId,
    marketingCampaignId: outreach.marketingCampaignId,
    emailSequence,
    outcome: 'sent',
  });

  const rendered = await renderTemplate({
    template,
    business,
    unsubscribeToken: outreach.unsubscribeToken,
    messageId: preSendMessage.messageId,
    marketingCampaignId: outreach.marketingCampaignId,
    emailSequence,
  });

  const sendResult = await sendMarketingCampaignEmail({
    to: eligibility.targetEmail,
    subject: rendered.subject,
    htmlBody: rendered.htmlBody,
    textBody: rendered.textBody,
  });

  if (!sendResult.ok) {
    const attemptCount = outreach.sendAttemptCount + 1;
    const willRetry = attemptCount < MAX_SEND_ATTEMPTS;
    await recordOutreachSendFailed({
      businessId: outreach.businessId,
      marketingCampaignId: outreach.marketingCampaignId,
      ...(willRetry
        ? { retryAt: new Date(Date.now() + RETRY_BACKOFF_HOURS * 60 * 60 * 1000).toISOString() }
        : {}),
    });
    log({
      level: 'error',
      event: 'marketing.email.send_failed',
      component: 'marketing',
      businessId: outreach.businessId,
      marketingCampaignId: outreach.marketingCampaignId,
      emailSequence,
      errorCategory: sendResult.error,
      retryable: willRetry,
      attempt: attemptCount,
    });
    return { outcome: 'failed', error: sendResult.error, willRetry };
  }

  const sentMessage = createMarketingMessage({
    businessId: outreach.businessId,
    marketingCampaignId: outreach.marketingCampaignId,
    emailSequence,
    outcome: 'sent',
    subjectSnapshot: rendered.subject,
    htmlBodySnapshot: rendered.htmlBody,
    textBodySnapshot: rendered.textBody,
    recipientEmail: eligibility.targetEmail,
    sesMessageId: sendResult.sesMessageId,
  });
  const messageWasNew = await putMarketingMessageIfNotExists(sentMessage);

  if (!messageWasNew) {
    // Lost an exceedingly unlikely race against a concurrent attempt for
    // the same step — SES already sent a real email, but do not
    // double-advance MarketingOutreach on top of whichever attempt won.
    log({
      level: 'warn',
      event: 'marketing.email.duplicate_send_race',
      component: 'marketing',
      businessId: outreach.businessId,
      marketingCampaignId: outreach.marketingCampaignId,
      emailSequence,
      sesMessageId: sendResult.sesMessageId,
    });
    return { outcome: 'sent', messageId: sentMessage.messageId, sesMessageId: sendResult.sesMessageId, emailSequence };
  }

  const nextSequence = (emailSequence < 3 ? ((emailSequence + 1) as EmailSequence) : undefined);
  await recordOutreachSendSucceeded({
    businessId: outreach.businessId,
    marketingCampaignId: outreach.marketingCampaignId,
    sentSequence: emailSequence,
    ...(nextSequence !== undefined
      ? { next: { nextActionSequence: nextSequence, nextActionAt: computeNextActionAt(outreach.deliveredAt, nextSequence) } }
      : {}),
  });

  log({
    event: 'marketing.email.sent',
    component: 'marketing',
    businessId: outreach.businessId,
    marketingCampaignId: outreach.marketingCampaignId,
    emailSequence,
    marketingMessageId: sentMessage.messageId,
    sesMessageId: sendResult.sesMessageId,
  });

  return { outcome: 'sent', messageId: sentMessage.messageId, sesMessageId: sendResult.sesMessageId, emailSequence };
}
