import 'server-only';
import { EMAIL_SEQUENCES } from '@/domain/models/email-template';
import type { MarketingCampaign } from '@/domain/models/marketing-campaign';
import { createMarketingCampaign } from '@/domain/factories/marketing-campaign.factory';
import { createEmailTemplate } from '@/domain/factories/email-template.factory';
import { getMarketingCampaignById, putMarketingCampaignIfNotExists } from '@/lib/db/marketing-campaigns';
import { getEmailTemplate, putEmailTemplateIfNotExists } from '@/lib/db/marketing-email-templates';
import { DEFAULT_EMAIL_TEMPLATES } from './default-templates';
import { MARKETING_CAMPAIGN_ID } from './constants';

/**
 * Lazily get-or-creates the MVP's single campaign row (always `'disabled'`
 * at creation — see `createMarketingCampaign`) and seeds its 3 default
 * templates if missing. CDK never seeds table data in this repo (see
 * `data-stack.ts`'s existing secrets/tables, none of which are
 * pre-populated), so this is the get-or-create path every other reader
 * (eligibility checks, the admin dashboard, the cron sweep) goes through
 * first. Safe to call repeatedly — every write here is a conditional
 * create-if-missing, never an overwrite of an admin's existing
 * `status`/template customization.
 */
export async function ensureMarketingCampaignExists(): Promise<MarketingCampaign> {
  let campaign = await getMarketingCampaignById(MARKETING_CAMPAIGN_ID);
  if (!campaign) {
    const created = createMarketingCampaign();
    await putMarketingCampaignIfNotExists(created);
    campaign = (await getMarketingCampaignById(MARKETING_CAMPAIGN_ID)) ?? created;
  }

  for (const sequence of EMAIL_SEQUENCES) {
    const existing = await getEmailTemplate(MARKETING_CAMPAIGN_ID, sequence);
    if (!existing) {
      const defaults = DEFAULT_EMAIL_TEMPLATES[sequence];
      await putEmailTemplateIfNotExists(
        createEmailTemplate({
          marketingCampaignId: MARKETING_CAMPAIGN_ID,
          emailSequence: sequence,
          subject: defaults.subject,
          body: defaults.body,
        }),
      );
    }
  }

  return campaign;
}
