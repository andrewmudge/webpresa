import 'server-only';
import type { MarketingCampaign } from '@/domain/models/marketing-campaign';
import type { MarketingOutreach } from '@/domain/models/marketing-outreach';
import type { MarketingMessage } from '@/domain/models/marketing-message';
import type { Business } from '@/domain/models/business';
import { MARKETING_CAMPAIGN_ID } from './constants';
import { ensureMarketingCampaignExists } from './campaign';
import { listOutreachForCampaign } from '@/lib/db/marketing-outreach';
import { listAllMarketingMessages } from '@/lib/db/marketing-messages';
import { listAllBusinesses } from '@/lib/db/businesses';

export interface MarketingKpis {
  postcardsDelivered: number;
  email1Sent: number;
  email2Sent: number;
  email3Sent: number;
  emailClicks: number;
  postcardEngagements: number;
  claims: number;
  customers: number;
  unsubscribes: number;
  bounces: number;
}

export interface OutreachRow {
  outreach: MarketingOutreach;
  business: Business | null;
  /** Every message for this business+campaign, ascending by sequence — the row's email-progress cells and the expandable detail's timeline both read from this. */
  messages: MarketingMessage[];
}

export interface MarketingDashboardData {
  campaign: MarketingCampaign;
  kpis: MarketingKpis;
  rows: OutreachRow[];
}

function computeKpis(rows: OutreachRow[], messages: MarketingMessage[]): MarketingKpis {
  let email1Sent = 0;
  let email2Sent = 0;
  let email3Sent = 0;
  let emailClicks = 0;
  let bounces = 0;

  for (const message of messages) {
    if (message.outcome === 'sent') {
      if (message.emailSequence === 1) email1Sent += 1;
      else if (message.emailSequence === 2) email2Sent += 1;
      else if (message.emailSequence === 3) email3Sent += 1;
    }
    emailClicks += message.clickCount;
    if (message.sesEventStatus === 'bounced') bounces += 1;
  }

  let postcardEngagements = 0;
  let claims = 0;
  let customers = 0;
  let unsubscribes = 0;

  for (const { outreach, business } of rows) {
    if (outreach.lastEventType === 'engaged') postcardEngagements += 1;
    if (business?.status === 'claimed') claims += 1;
    if (business?.status === 'customer') customers += 1;
    if (outreach.suppressionReason === 'unsubscribed') unsubscribes += 1;
  }

  return {
    postcardsDelivered: rows.length,
    email1Sent,
    email2Sent,
    email3Sent,
    emailClicks,
    postcardEngagements,
    claims,
    customers,
    unsubscribes,
    bounces,
  };
}

/**
 * Bounded direct DynamoDB reads, no scans across the whole system — mirrors
 * `lib/operations/needs-attention.ts`'s and `lib/analytics/dashboard.ts`'s
 * existing convention. `listAllMarketingMessages`/`listAllBusinesses` are
 * each a capped `Scan` (see their own doc comments); at MVP outreach volume
 * (dozens/hundreds of businesses, not the whole `Businesses` table) this is
 * the same tradeoff already accepted for the Operations page.
 */
export async function getMarketingDashboardData(): Promise<MarketingDashboardData> {
  const campaign = await ensureMarketingCampaignExists();
  const [outreachList, messages, businesses] = await Promise.all([
    listOutreachForCampaign(MARKETING_CAMPAIGN_ID),
    listAllMarketingMessages(),
    listAllBusinesses(),
  ]);

  const businessById = new Map(businesses.map((business) => [business.businessId, business]));
  const messagesByBusiness = new Map<string, MarketingMessage[]>();
  for (const message of messages) {
    const list = messagesByBusiness.get(message.businessId) ?? [];
    list.push(message);
    messagesByBusiness.set(message.businessId, list);
  }

  const rows: OutreachRow[] = outreachList.map((outreach) => ({
    outreach,
    business: businessById.get(outreach.businessId) ?? null,
    messages: (messagesByBusiness.get(outreach.businessId) ?? []).slice().sort((a, b) => a.emailSequence - b.emailSequence),
  }));

  return { campaign, kpis: computeKpis(rows, messages), rows };
}
