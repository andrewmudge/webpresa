import { verifySnsMessageSignature, type SnsMessageEnvelope } from '@/lib/ses/verify-sns-signature';
import { createMarketingSesEvent } from '@/domain/factories/marketing-ses-event.factory';
import { putMarketingSesEventIfNotExists } from '@/lib/db/marketing-ses-events';
import { getMarketingMessageBySesMessageId, applyMarketingMessageSesRollup } from '@/lib/db/marketing-messages';
import { createMarketingSuppression } from '@/domain/factories/marketing-suppression.factory';
import { putMarketingSuppressionIfNotExists } from '@/lib/db/marketing-suppressions';
import { transitionOutreachToTerminal } from '@/lib/db/marketing-outreach';
import { log } from '@/lib/logging/log';

/**
 * SES event webhook (Marketing stage) — Configuration Set → SNS → this
 * HTTPS route, structurally mirroring `app/api/webhooks/lob/route.ts`:
 * verify → durable write first → conditional rollup → 200 on
 * recognized-but-irrelevant, 500 only on genuine internal error.
 *
 * The SNS topic auto-confirms its own subscription against this route (the
 * `SubscriptionConfirmation` branch below) — unlike Lob, there is no
 * manual dashboard registration step.
 */

interface SesEventPayload {
  eventType: string;
  mail: { messageId: string; timestamp?: string };
  bounce?: { bounceType: string; bouncedRecipients?: Array<{ emailAddress: string }> };
  complaint?: { complainedRecipients?: Array<{ emailAddress: string }> };
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();

  let envelope: SnsMessageEnvelope;
  try {
    envelope = JSON.parse(rawBody) as SnsMessageEnvelope;
  } catch {
    log({ level: 'warn', event: 'ses.webhook.invalid_json', component: 'ses-webhook' });
    return new Response('Invalid payload', { status: 400 });
  }

  const valid = await verifySnsMessageSignature(envelope);
  if (!valid) {
    log({ level: 'warn', event: 'ses.webhook.invalid_signature', component: 'ses-webhook' });
    return new Response('Invalid signature', { status: 400 });
  }

  if (envelope.Type === 'SubscriptionConfirmation') {
    if (!envelope.SubscribeURL) return new Response(null, { status: 200 });
    try {
      await fetch(envelope.SubscribeURL);
    } catch (err) {
      log({ level: 'error', event: 'ses.webhook.subscription_confirm_failed', component: 'ses-webhook', message: err instanceof Error ? err.message : 'unknown' });
      return new Response(null, { status: 500 });
    }
    log({ event: 'ses.webhook.subscription_confirmed', component: 'ses-webhook' });
    return new Response(null, { status: 200 });
  }

  if (envelope.Type !== 'Notification') {
    return new Response(null, { status: 200 });
  }

  let sesEvent: SesEventPayload;
  try {
    sesEvent = JSON.parse(envelope.Message) as SesEventPayload;
  } catch {
    log({ level: 'warn', event: 'ses.webhook.invalid_message_json', component: 'ses-webhook' });
    return new Response(null, { status: 200 });
  }

  const sesMessageId = sesEvent.mail?.messageId;
  const eventType = sesEvent.eventType;
  if (!sesMessageId || !eventType) {
    log({ level: 'warn', event: 'ses.webhook.unresolvable_payload', component: 'ses-webhook' });
    return new Response(null, { status: 200 });
  }

  try {
    const record = createMarketingSesEvent({
      snsMessageId: envelope.MessageId,
      sesMessageId,
      eventType,
      rawPayload: sesEvent as unknown as Record<string, unknown>,
    });
    const newlyRecorded = await putMarketingSesEventIfNotExists(record);

    if (newlyRecorded) {
      const message = await getMarketingMessageBySesMessageId(sesMessageId);
      if (!message) {
        log({ level: 'warn', event: 'ses.webhook.unknown_message', component: 'ses-webhook', operation: eventType, sesMessageId });
        return new Response(null, { status: 200 });
      }

      const occurredAt = record.receivedAt;

      if (eventType === 'Delivery') {
        await applyMarketingMessageSesRollup(message.businessId, message.sortKey, { sesEventStatus: 'delivered', deliveredAt: occurredAt });
      } else if (eventType === 'Bounce') {
        await applyMarketingMessageSesRollup(message.businessId, message.sortKey, { sesEventStatus: 'bounced', bouncedAt: occurredAt });
        // Only a hard (Permanent) bounce suppresses — soft/transient bounces are recorded but never suppress, standard SES deliverability practice.
        if (sesEvent.bounce?.bounceType === 'Permanent') {
          const recipientEmail = sesEvent.bounce.bouncedRecipients?.[0]?.emailAddress;
          if (recipientEmail) {
            await putMarketingSuppressionIfNotExists(
              createMarketingSuppression({ emailNormalized: recipientEmail.trim().toLowerCase(), businessId: message.businessId, reason: 'hard_bounce' }),
            );
          }
          await transitionOutreachToTerminal({
            businessId: message.businessId,
            marketingCampaignId: message.marketingCampaignId,
            status: 'suppressed',
            suppressionReason: 'hard_bounce',
            lastEventType: 'hard_bounce',
          });
        }
      } else if (eventType === 'Complaint') {
        await applyMarketingMessageSesRollup(message.businessId, message.sortKey, { sesEventStatus: 'complained', complainedAt: occurredAt });
        const recipientEmail = sesEvent.complaint?.complainedRecipients?.[0]?.emailAddress;
        if (recipientEmail) {
          await putMarketingSuppressionIfNotExists(
            createMarketingSuppression({ emailNormalized: recipientEmail.trim().toLowerCase(), businessId: message.businessId, reason: 'complaint' }),
          );
        }
        await transitionOutreachToTerminal({
          businessId: message.businessId,
          marketingCampaignId: message.marketingCampaignId,
          status: 'suppressed',
          suppressionReason: 'complaint',
          lastEventType: 'complaint',
        });
      }
      // Send/Reject — diagnostic only; the durable MarketingSesEvent record above is enough.
      // Reject deliberately does NOT auto-suppress (rare, better surfaced via Operations).
    }

    log({
      event: 'ses.webhook.processed',
      component: 'ses-webhook',
      operation: eventType,
      sesMessageId,
      message: newlyRecorded ? 'newly_recorded' : 'dedup_no_op',
    });
    return new Response(null, { status: 200 });
  } catch (err) {
    log({ level: 'error', event: 'ses.webhook.processing_failed', component: 'ses-webhook', operation: eventType, sesMessageId, message: err instanceof Error ? err.message : 'unknown' });
    return new Response(null, { status: 500 });
  }
}
