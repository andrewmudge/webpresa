'use server';
import { getSession } from '@/lib/auth/session';
import { getBusinessById } from '@/lib/db/businesses';
import { listCampaignRecipientsForCampaign } from '@/lib/db/campaign-recipients';
import { startScanWorkflow } from '@/lib/workflow/run-scan-workflow';

/**
 * Campaign-wide "Run full scan" — loops the existing single-business
 * `startScanWorkflow` (see `lib/workflow/run-scan-workflow.ts`, already used
 * by the business detail page's own "Run full scan" button) over every
 * unique business currently a recipient of this campaign. No redirect —
 * there's no single business to land on — called directly from the client
 * via `useTransition`, unlike the single-business `runScanWorkflowAction`.
 */

export interface RunCampaignScanResult {
  businessId: string;
  businessName: string;
  status: 'started' | 'conflict' | 'failed';
  message?: string;
}

export interface RunCampaignScanSummary {
  started: number;
  conflict: number;
  failed: number;
  results: RunCampaignScanResult[];
}

export async function runCampaignScanAction(campaignId: string): Promise<RunCampaignScanSummary> {
  const session = await getSession();
  if (!session) {
    return { started: 0, conflict: 0, failed: 0, results: [] };
  }

  const recipients = await listCampaignRecipientsForCampaign(campaignId);
  const businessIds = Array.from(new Set(recipients.map((r) => r.businessId)));

  const summary: RunCampaignScanSummary = { started: 0, conflict: 0, failed: 0, results: [] };

  for (const businessId of businessIds) {
    const business = await getBusinessById(businessId);
    const businessName = business?.name ?? businessId;

    const outcome = await startScanWorkflow(businessId, session.sub);
    if (outcome.status === 'started') summary.started += 1;
    else if (outcome.status === 'conflict') summary.conflict += 1;
    else summary.failed += 1;

    summary.results.push({ businessId, businessName, status: outcome.status, message: outcome.message });
  }

  return summary;
}
