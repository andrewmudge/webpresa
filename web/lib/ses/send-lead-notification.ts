import 'server-only';
import { SendEmailCommand } from '@aws-sdk/client-sesv2';
import type { Lead } from '@/domain/models/lead';
import { getSesClient } from './client';

/** Bounded so a slow/hanging SES call never meaningfully delays the visitor-facing response past what's reasonable. */
const SEND_TIMEOUT_MS = 5000;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type SendLeadNotificationResult = { ok: true } | { ok: false; error: string };

/**
 * Sends the owner-notification email for one lead via Amazon SES. Returns a
 * result rather than throwing — the caller (`lib/leads/notify.ts`) always
 * records the outcome on the Lead record regardless of success/failure.
 *
 * Note: while AWS SES account is in sandbox mode, `to` must be one of the
 * addresses verified in the SES console (see deployment.md) or the send
 * will fail — expected, not a bug, until production access is approved.
 */
export async function sendLeadNotificationEmail(params: {
  to: string;
  businessName: string;
  sourcePage: string;
  lead: Pick<Lead, 'name' | 'phone' | 'email' | 'serviceNeeded' | 'message' | 'createdAt'>;
}): Promise<SendLeadNotificationResult> {
  const fromAddress = process.env.SES_FROM_EMAIL;
  if (!fromAddress) return { ok: false, error: 'ses_from_email_not_configured' };

  const { to, businessName, sourcePage, lead } = params;

  const rows: Array<[string, string]> = [
    ['Name', lead.name],
    ...(lead.phone ? ([['Phone', lead.phone]] satisfies Array<[string, string]>) : []),
    ...(lead.email ? ([['Email', lead.email]] satisfies Array<[string, string]>) : []),
    ...(lead.serviceNeeded ? ([['Service needed', lead.serviceNeeded]] satisfies Array<[string, string]>) : []),
    ...(lead.message ? ([['Details', lead.message]] satisfies Array<[string, string]>) : []),
    ['Submitted', new Date(lead.createdAt).toLocaleString('en-US')],
    ['Source', sourcePage],
  ];

  const htmlBody = `<p>New service request for <strong>${escapeHtml(businessName)}</strong>:</p><table cellpadding="4">${rows
    .map(([label, value]) => `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(value)}</td></tr>`)
    .join('')}</table>`;
  const textBody = rows.map(([label, value]) => `${label}: ${value}`).join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const client = getSesClient();
    await client.send(
      new SendEmailCommand({
        FromEmailAddress: fromAddress,
        Destination: { ToAddresses: [to] },
        // Only when the submitter supplied one — never the visitor's IP or any inferred address.
        ...(lead.email ? { ReplyToAddresses: [lead.email] } : {}),
        Content: {
          Simple: {
            Subject: { Data: `New service request — ${businessName}` },
            Body: {
              Html: { Data: htmlBody },
              Text: { Data: textBody },
            },
          },
        },
      }),
      { abortSignal: controller.signal },
    );
    return { ok: true };
  } catch (err) {
    // Never the raw SES error message — it can echo request content back.
    // The exception name alone (e.g. 'MessageRejected',
    // 'MailFromDomainNotVerifiedException') is enough for admin diagnosis.
    return { ok: false, error: err instanceof Error ? err.name : 'unknown_error' };
  } finally {
    clearTimeout(timeout);
  }
}
