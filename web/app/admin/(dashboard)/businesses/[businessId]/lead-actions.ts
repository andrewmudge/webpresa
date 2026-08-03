'use server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getLeadById } from '@/lib/db/leads';
import { getBusinessById } from '@/lib/db/businesses';
import { sendLeadNotificationAndRecordOutcome } from '@/lib/leads/notify';

/**
 * Stage 20 — a manual per-lead retry for a notification stuck in 'failed'.
 * Calls the exact same send-and-record function the scheduled Vercel Cron
 * sweep uses (`lib/leads/notify.ts`), so there is never a second, drifting
 * copy of "what counts as success".
 */
export async function retryLeadNotificationAction(businessId: string, leadId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const lead = await getLeadById(leadId);
  const business = await getBusinessById(businessId);
  if (lead && business && lead.businessId === businessId) {
    await sendLeadNotificationAndRecordOutcome(lead, business);
  }

  redirect(`/admin/businesses/${businessId}#leads-section`);
}
