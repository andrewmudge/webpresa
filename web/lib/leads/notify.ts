import 'server-only';
import type { Lead } from '@/domain/models/lead';
import type { Business } from '@/domain/models/business';
import { sendLeadNotificationEmail } from '@/lib/ses/send-lead-notification';
import { updateLeadNotificationOutcome } from '@/lib/db/leads';

/**
 * Sends the owner-notification email for one lead and records the outcome
 * on the Lead record itself. The one shared implementation for every
 * caller that ever attempts this send — the initial submission
 * (`app/b/[slug]/actions.ts`), the scheduled Vercel Cron retry sweep
 * (`app/api/internal/leads/retry-notifications/route.ts`), and the admin's
 * manual per-lead retry action — so there is never a second, drifting copy
 * of "what counts as success" or "how attempts are recorded".
 *
 * Never throws — every failure mode (no `Business.email` configured, SES
 * error, timeout) is recorded as a `'failed'` outcome and swallowed. A
 * notification failure must never affect the caller's own control flow;
 * the Lead is already durable by the time this ever runs.
 */
export async function sendLeadNotificationAndRecordOutcome(
  lead: Lead,
  business: Pick<Business, 'email' | 'name' | 'slug'>,
): Promise<void> {
  if (!business.email) {
    await updateLeadNotificationOutcome(lead.leadId, {
      status: 'failed',
      error: 'business_has_no_notification_email',
    });
    return;
  }

  const result = await sendLeadNotificationEmail({
    to: business.email,
    businessName: business.name,
    sourcePage: `/b/${business.slug}`,
    lead,
  });

  await updateLeadNotificationOutcome(
    lead.leadId,
    result.ok ? { status: 'sent' } : { status: 'failed', error: result.error },
  );
}
