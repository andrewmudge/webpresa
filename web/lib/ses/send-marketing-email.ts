import 'server-only';
import { SendEmailCommand } from '@aws-sdk/client-sesv2';
import { getSesClient } from './client';

/** Bounded so a slow/hanging SES call never meaningfully delays a cron sweep item or an admin's "send now"/test-send action. */
const SEND_TIMEOUT_MS = 5000;

export type SendMarketingEmailResult = { ok: true; sesMessageId: string } | { ok: false; error: string };

/**
 * Sends one already-rendered marketing email via Amazon SES. Distinct from
 * `sendLeadNotificationEmail` — separate `MARKETING_SES_FROM_EMAIL`
 * identity (different sending purpose/reputation from transactional lead
 * notifications) and tagged with the Marketing Configuration Set (SES
 * event tracking — see `infra/lib/stacks/ses-stack.ts`) when configured.
 * Returns a result rather than throwing, exactly like
 * `sendLeadNotificationEmail` — the caller always records the outcome on
 * the relevant `MarketingOutreach`/`MarketingMessage` record regardless of
 * success/failure.
 */
export async function sendMarketingCampaignEmail(params: {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}): Promise<SendMarketingEmailResult> {
  const fromAddress = process.env.MARKETING_SES_FROM_EMAIL;
  if (!fromAddress) return { ok: false, error: 'marketing_ses_from_email_not_configured' };

  const { to, subject, htmlBody, textBody } = params;
  const configurationSetName = process.env.SES_CONFIGURATION_SET_NAME;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const client = getSesClient();
    const result = await client.send(
      new SendEmailCommand({
        FromEmailAddress: fromAddress,
        Destination: { ToAddresses: [to] },
        ...(configurationSetName ? { ConfigurationSetName: configurationSetName } : {}),
        Content: {
          Simple: {
            Subject: { Data: subject },
            Body: {
              Html: { Data: htmlBody },
              Text: { Data: textBody },
            },
          },
        },
      }),
      { abortSignal: controller.signal },
    );
    if (!result.MessageId) return { ok: false, error: 'ses_no_message_id' };
    return { ok: true, sesMessageId: result.MessageId };
  } catch (err) {
    // Never the raw SES error message — see sendLeadNotificationEmail's
    // identical precedent for why (it can echo request content back).
    return { ok: false, error: err instanceof Error ? err.name : 'unknown_error' };
  } finally {
    clearTimeout(timeout);
  }
}
