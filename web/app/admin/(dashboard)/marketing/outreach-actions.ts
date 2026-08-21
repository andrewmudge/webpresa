'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/session';
import {
  getMarketingOutreach,
  pauseOutreach,
  resumeOutreach,
  suppressOutreachManually,
  cancelRemainingOutreach,
} from '@/lib/db/marketing-outreach';
import { attemptSendForOutreach } from '@/lib/marketing/send';
import { log } from '@/lib/logging/log';

/**
 * Manual admin controls for one business's outreach (`implementation.md`,
 * Marketing stage, "Manual admin controls"). Each transition is guarded by
 * a conditional DynamoDB write in `lib/db/marketing-outreach.ts` — this
 * layer only adds the auth check and the audit log line.
 */

function readKeys(formData: FormData): { businessId: string; marketingCampaignId: string } {
  return {
    businessId: String(formData.get('businessId') ?? ''),
    marketingCampaignId: String(formData.get('marketingCampaignId') ?? ''),
  };
}

export async function pauseOutreachAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const { businessId, marketingCampaignId } = readKeys(formData);
  const ok = await pauseOutreach(businessId, marketingCampaignId);
  log({ event: 'admin.marketing.outreach_paused', component: 'admin-actions', actorId: session.sub, businessId, marketingCampaignId, status: ok ? 'ok' : 'no_op' });
  revalidatePath('/admin/marketing');
}

export async function resumeOutreachAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const { businessId, marketingCampaignId } = readKeys(formData);
  const ok = await resumeOutreach(businessId, marketingCampaignId);
  log({ event: 'admin.marketing.outreach_resumed', component: 'admin-actions', actorId: session.sub, businessId, marketingCampaignId, status: ok ? 'ok' : 'no_op' });
  revalidatePath('/admin/marketing');
}

export async function suppressOutreachAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const { businessId, marketingCampaignId } = readKeys(formData);
  const ok = await suppressOutreachManually(businessId, marketingCampaignId);
  log({ event: 'admin.marketing.outreach_suppressed', component: 'admin-actions', actorId: session.sub, businessId, marketingCampaignId, status: ok ? 'ok' : 'no_op' });
  revalidatePath('/admin/marketing');
}

export async function cancelRemainingOutreachAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const { businessId, marketingCampaignId } = readKeys(formData);
  const ok = await cancelRemainingOutreach(businessId, marketingCampaignId);
  log({ event: 'admin.marketing.outreach_cancelled', component: 'admin-actions', actorId: session.sub, businessId, marketingCampaignId, status: ok ? 'ok' : 'no_op' });
  revalidatePath('/admin/marketing');
}

/**
 * "Send Next Email Now" — re-runs the exact same eligibility check and send
 * path the daily cron uses (`attemptSendForOutreach`), never a shortcut
 * around suppression/unsubscribe/bounce/complaint checks. The confirmation
 * step lives client-side (`OutreachTable.tsx`) before this action is ever
 * called.
 */
export async function sendNextEmailNowAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const { businessId, marketingCampaignId } = readKeys(formData);

  const outreach = await getMarketingOutreach(businessId, marketingCampaignId);
  if (!outreach) {
    log({ level: 'warn', event: 'admin.marketing.email_manually_triggered', component: 'admin-actions', actorId: session.sub, businessId, marketingCampaignId, status: 'outreach_not_found' });
    return;
  }

  const result = await attemptSendForOutreach(outreach);
  log({
    event: 'admin.marketing.email_manually_triggered',
    component: 'admin-actions',
    actorId: session.sub,
    businessId,
    marketingCampaignId,
    status: result.outcome,
  });
  revalidatePath('/admin/marketing');
}
