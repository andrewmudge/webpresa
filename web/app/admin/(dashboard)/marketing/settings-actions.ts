'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/session';
import { updateMarketingCampaignStatus } from '@/lib/db/marketing-campaigns';
import { MARKETING_CAMPAIGN_ID } from '@/lib/marketing/constants';
import { log } from '@/lib/logging/log';

/** Enable/disable the whole campaign — the global kill switch (`implementation.md`, Marketing stage, "Marketing campaign configuration"). When disabled, `checkMarketingEligibility` refuses every send fresh, so no separate "cancel all scheduled emails" step is needed here. */
export async function updateCampaignEnabledAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const enabled = formData.get('enabled') === 'true';
  const status = enabled ? 'enabled' : 'disabled';

  await updateMarketingCampaignStatus(MARKETING_CAMPAIGN_ID, status, session.sub);
  log({
    event: 'admin.marketing.campaign_toggled',
    component: 'admin-actions',
    actorId: session.sub,
    marketingCampaignId: MARKETING_CAMPAIGN_ID,
    status,
  });
  revalidatePath('/admin/marketing');
}
