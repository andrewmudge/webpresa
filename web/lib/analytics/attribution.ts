import { BUSINESS_STATUSES, type Business } from '@/domain/models/business';
import type { Postcard, PostcardTemplateVariant } from '@/domain/models/postcard';
import type { CampaignRecipient } from '@/domain/models/campaign-recipient';
import { resolvePostcardTemplateVariant } from '@/lib/postcards/template';
import { safeDivide, normalizeToMonthlyCents } from './calculations';
import { MIN_TEMPLATE_SAMPLE_SIZE } from './dashboard-types';
import type { FunnelResult, FunnelStage, TemplatePerformanceRow, BestTemplateResult, CancellationReasonsResult } from './dashboard-types';

/**
 * Stage 29 — pure postcard -> recipient -> business joins, no I/O. Funnel
 * events are defined against the real, already-shipped funnel this
 * codebase's own write paths produce (see `lib/db/businesses.ts`'s
 * `advanceBusinessStatus` and `lib/stripe/status-mapping.ts`'s
 * `deriveBusinessStatusFromSubscriptionStatus`), not a separate model.
 */

export interface PostcardCohortInput {
  /** Already filtered to real campaign mailings (`campaignRecipientId` set) submitted within the selected window. */
  postcards: Postcard[];
  recipientsById: Map<string, CampaignRecipient>;
  businessesById: Map<string, Business>;
}

const STATUS_RANK = new Map<Business['status'], number>(BUSINESS_STATUSES.map((status, index) => [status, index]));
const CLAIMED_RANK = STATUS_RANK.get('claimed')!;

/** `'claimed' | 'customer' | 'cancelled'` all rank at or above `'claimed'` — a business that later paid or later cancelled was, at some point, definitely claimed. */
function isClaimedOrLater(business: Pick<Business, 'status'>): boolean {
  return (STATUS_RANK.get(business.status) ?? -1) >= CLAIMED_RANK;
}

function recipientForPostcard(postcard: Postcard, recipientsById: Map<string, CampaignRecipient>): CampaignRecipient | undefined {
  return postcard.campaignRecipientId ? recipientsById.get(postcard.campaignRecipientId) : undefined;
}

/**
 * Funnel counts are postcard-indexed (they count the mailed piece, not a
 * deduped customer) for every stage except Paid, which switches to
 * distinct-businesses — matching the KPI's own "Customers Paid" label and
 * avoiding one business's several postcards inflating the paid count.
 *
 * "Signed Up" is deliberately the SAME count as "Claimed": in this
 * architecture, claim consumption and Cognito account creation/sign-in
 * happen atomically in one transaction (`consumeClaim()`,
 * `app/claim/actions.ts`) — there is no distinct "created an account but
 * hasn't claimed yet" state to count separately. This is a documented
 * approximation, not a bug.
 */
export function attributePostcardOutcomes(input: PostcardCohortInput): FunnelResult {
  const { postcards, recipientsById, businessesById } = input;

  const sent = postcards.length;
  let engaged = 0;
  let claimed = 0;
  const cohortBusinessIds = new Set<string>();

  for (const postcard of postcards) {
    const recipient = recipientForPostcard(postcard, recipientsById);
    if (!recipient) continue;
    const business = businessesById.get(recipient.businessId);
    if (!business) continue;

    cohortBusinessIds.add(business.businessId);
    if (recipient.estimatedUniqueScans > 0) engaged++; // deduped fingerprint estimate — 5 repeated scans of one QR still count as 1 engaged postcard
    if (isClaimedOrLater(business)) claimed++;
  }

  const paid = Array.from(cohortBusinessIds).filter((id) => businessesById.get(id)?.firstPaidAt).length;
  const signedUp = claimed;

  const stages: FunnelStage[] = [
    { key: 'sent', label: 'Postcards Sent', count: sent, conversionFromPrevious: null },
    { key: 'engaged', label: 'Postcards Engaged', count: engaged, conversionFromPrevious: safeDivide(engaged, sent) },
    { key: 'claimed', label: 'Postcards Claimed', count: claimed, conversionFromPrevious: safeDivide(claimed, engaged) },
    { key: 'signedUp', label: 'Customers Signed Up', count: signedUp, conversionFromPrevious: safeDivide(signedUp, claimed) },
    { key: 'paid', label: 'Customers Paid', count: paid, conversionFromPrevious: safeDivide(paid, signedUp) },
  ];

  return { stages, overallConversion: safeDivide(paid, sent), cohortSize: sent };
}

/**
 * Resolves, for every claimId shared by more than one cohort recipient (a
 * real, existing code path — `campaigns/actions.ts` reuses a still-usable
 * claim across recipients for the same not-yet-claimed business), which
 * single recipient gets "claimed"/"paid" attribution credit in the
 * per-template table: the recipient with the earliest `createdAt`.
 * Deterministic and documented, never probabilistic. A recipient with no
 * `claimId`, or an unshared one, is always credited. This prevents one
 * claimed business from inflating two different templates' (or two rows of
 * the same template's) claim/paid counts — it does NOT affect the
 * business-level funnel above, which is deliberately postcard-indexed.
 */
function resolveCreditedRecipientIds(postcards: Postcard[], recipientsById: Map<string, CampaignRecipient>): Set<string> {
  const groupsByClaimId = new Map<string, CampaignRecipient[]>();
  for (const postcard of postcards) {
    const recipient = recipientForPostcard(postcard, recipientsById);
    if (!recipient?.claimId) continue;
    const group = groupsByClaimId.get(recipient.claimId) ?? [];
    group.push(recipient);
    groupsByClaimId.set(recipient.claimId, group);
  }

  const credited = new Set<string>();
  for (const group of groupsByClaimId.values()) {
    const earliest = group.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));
    credited.add(earliest.campaignRecipientId);
  }
  return credited;
}

export function aggregateTemplatePerformance(input: PostcardCohortInput): TemplatePerformanceRow[] {
  const { postcards, recipientsById, businessesById } = input;
  const creditedRecipientIds = resolveCreditedRecipientIds(postcards, recipientsById);

  interface Accumulator {
    sent: number;
    engaged: number;
    claimed: number;
    paidBusinessIds: Set<string>;
  }
  const groups = new Map<PostcardTemplateVariant, Accumulator>();

  for (const postcard of postcards) {
    const recipient = recipientForPostcard(postcard, recipientsById);
    if (!recipient) continue;
    const business = businessesById.get(recipient.businessId);
    if (!business) continue;

    const templateVariant = postcard.templateVariant ?? resolvePostcardTemplateVariant(business);
    const group = groups.get(templateVariant) ?? { sent: 0, engaged: 0, claimed: 0, paidBusinessIds: new Set<string>() };

    group.sent++;
    if (recipient.estimatedUniqueScans > 0) group.engaged++;

    const isCredited = !recipient.claimId || creditedRecipientIds.has(recipient.campaignRecipientId);
    if (isCredited) {
      if (isClaimedOrLater(business)) group.claimed++;
      if (business.firstPaidAt) group.paidBusinessIds.add(business.businessId);
    }

    groups.set(templateVariant, group);
  }

  return Array.from(groups.entries()).map(([templateVariant, group]) => {
    const paidCustomers = group.paidBusinessIds.size;
    const revenueAttributedCents = Array.from(group.paidBusinessIds).reduce((sum, businessId) => {
      const business = businessesById.get(businessId);
      return sum + (business ? normalizeToMonthlyCents(business.plan, business.billingInterval) : 0);
    }, 0);

    return {
      templateVariant,
      sent: group.sent,
      engaged: group.engaged,
      engagementRate: safeDivide(group.engaged, group.sent),
      claimed: group.claimed,
      claimRate: safeDivide(group.claimed, group.sent),
      paidCustomers,
      paidConversion: safeDivide(paidCustomers, group.sent),
      revenueAttributedCents,
    };
  });
}

/** Ties broken by higher `sent`, then alphabetically by `templateVariant` — deterministic, never probabilistic. */
export function pickBestPerformingTemplate(rows: TemplatePerformanceRow[], minSampleSize: number = MIN_TEMPLATE_SAMPLE_SIZE): BestTemplateResult {
  const eligible = rows.filter((row) => row.sent >= minSampleSize);
  if (eligible.length === 0) return { status: 'insufficient_data' };

  const best = eligible.reduce((champion, row) => {
    const championRate = champion.paidConversion ?? -1;
    const rowRate = row.paidConversion ?? -1;
    if (rowRate !== championRate) return rowRate > championRate ? row : champion;
    if (row.sent !== champion.sent) return row.sent > champion.sent ? row : champion;
    return row.templateVariant < champion.templateVariant ? row : champion;
  });

  return { status: 'ok', row: best, sampleSize: best.sent };
}

/**
 * Webpresa does not capture cancellation reasons today — no
 * `cancellation_details` handling in `app/api/webhooks/stripe/route.ts`, no
 * survey, no `Business` field. To add real capture later: (1) enable
 * Stripe's Customer Portal cancellation-reason collection and read
 * `subscription.cancellation_details.feedback`/`.comment` off the webhook's
 * re-fetched subscription object in `mapStripeSubscriptionToAppState()`,
 * persisting it alongside `canceledAt`; or (2) build a pre-cancellation
 * survey step in the customer billing UI. Out of scope for Stage 29 — do
 * not invent data here.
 */
export function getCancellationReasons(): CancellationReasonsResult {
  return { collected: false, breakdown: [] };
}
