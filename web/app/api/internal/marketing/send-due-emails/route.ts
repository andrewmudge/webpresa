import { NextResponse } from 'next/server';
import { verifyVercelCronRequest } from '@/lib/internal-auth';
import { MARKETING_CAMPAIGN_ID } from '@/lib/marketing/constants';
import { listDueOutreach } from '@/lib/db/marketing-outreach';
import { attemptSendForOutreach } from '@/lib/marketing/send';
import { log } from '@/lib/logging/log';

/**
 * Marketing stage — the daily sweep that sends every drip-campaign email
 * currently due. Vercel Cron, once daily (see `web/vercel.json`), the same
 * scheduling mechanism `app/api/internal/leads/retry-notifications/route.ts`
 * already established as this app's only precedent — no EventBridge
 * Scheduler/async-Lambda infra exists anywhere in this repo. Once-daily
 * granularity is acceptable: the campaign's own timing (+1/+4/+10 days) is
 * already expressed as "approximately," and the existing cron's actual
 * schedule (`0 6 * * *`) is itself evidence a more frequent interval isn't
 * available on the current Vercel plan.
 *
 * Every item in the sweep is independently try/caught — one record's
 * failure must never abort the rest of the sweep (see
 * `implementation.md`, Marketing stage, "Failure behavior"). Fresh
 * eligibility is re-checked per item inside `attemptSendForOutreach` itself
 * — this route never assumes `nextActionAt` being due still means "safe to
 * send."
 */
export async function GET(request: Request) {
  if (!(await verifyVercelCronRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const nowIso = new Date().toISOString();
  const due = await listDueOutreach(MARKETING_CAMPAIGN_ID, nowIso);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const outreach of due) {
    try {
      const result = await attemptSendForOutreach(outreach);
      if (result.outcome === 'sent') sent += 1;
      else if (result.outcome === 'skipped') skipped += 1;
      else failed += 1;
    } catch (err) {
      failed += 1;
      log({
        level: 'error',
        event: 'marketing.email.sweep_item_failed',
        component: 'marketing-cron',
        businessId: outreach.businessId,
        marketingCampaignId: outreach.marketingCampaignId,
        message: err instanceof Error ? err.message : 'unknown error',
      });
    }
  }

  log({
    event: 'marketing.email.sweep_completed',
    component: 'marketing-cron',
    marketingCampaignId: MARKETING_CAMPAIGN_ID,
    message: `due=${due.length} sent=${sent} skipped=${skipped} failed=${failed}`,
  });

  return NextResponse.json({ due: due.length, sent, skipped, failed });
}
