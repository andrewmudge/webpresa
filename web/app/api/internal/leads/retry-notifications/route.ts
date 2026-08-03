import { NextResponse } from 'next/server';
import { verifyVercelCronRequest } from '@/lib/internal-auth';
import { listLeadsNeedingNotificationRetry } from '@/lib/db/leads';
import { getBusinessById } from '@/lib/db/businesses';
import { sendLeadNotificationAndRecordOutcome } from '@/lib/leads/notify';

/**
 * Stage 20 — the scheduled retry sweep for lead-notification emails that
 * didn't send on the first (inline) attempt. Invoked by Vercel Cron every
 * 15 minutes (see `web/vercel.json`) — this app's first use of Vercel Cron;
 * no EventBridge-scheduled-rule or other calendar-scheduled precedent
 * exists anywhere in `infra/` to follow instead.
 *
 * Deliberately not a SQS+Lambda+DLQ pipeline — persist-then-inline-send
 * with this bounded retry sweep is the whole delivery mechanism for this
 * stage; a lead that exhausts its attempts stays `'failed'` for admin
 * visibility/manual retry rather than landing in a dead-letter queue.
 */

const MAX_NOTIFICATION_ATTEMPTS = 5;

export async function GET(request: Request) {
  if (!(await verifyVercelCronRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const candidates = await listLeadsNeedingNotificationRetry(MAX_NOTIFICATION_ATTEMPTS);

  let attempted = 0;
  for (const lead of candidates) {
    const business = await getBusinessById(lead.businessId);
    if (!business) continue; // orphaned lead (deleted business) — nothing to notify
    await sendLeadNotificationAndRecordOutcome(lead, business);
    attempted += 1;
  }

  return NextResponse.json({ candidates: candidates.length, attempted });
}
