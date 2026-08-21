import { describe, it, expect } from 'vitest';
import type { Business } from '@/domain/models/business';
import type { Postcard } from '@/domain/models/postcard';
import type { CampaignRecipient } from '@/domain/models/campaign-recipient';
import { attributePostcardOutcomes, aggregateTemplatePerformance, pickBestPerformingTemplate, getCancellationReasons } from '../attribution';
import type { PostcardCohortInput } from '../attribution';
import type { TemplatePerformanceRow } from '../dashboard-types';

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_1',
    slug: 'acme',
    name: 'Acme',
    industry: 'plumbing',
    source: 'manual',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makePostcard(overrides: Partial<Postcard> = {}): Postcard {
  return {
    postcardId: 'postcard_1',
    businessId: 'biz_1',
    previewId: 'preview_1',
    campaignRecipientId: 'recipient_1',
    provider: 'lob',
    status: 'submitted',
    submittedAt: '2026-07-01T00:00:00.000Z',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeRecipient(overrides: Partial<CampaignRecipient> = {}): CampaignRecipient {
  return {
    campaignRecipientId: 'recipient_1',
    campaignId: 'campaign_1',
    businessId: 'biz_1',
    campaignCode: 'ABCD1234EFGH5678',
    destinationType: 'claim',
    status: 'active',
    totalScans: 0,
    estimatedUniqueScans: 0,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildInput(postcards: Postcard[], recipients: CampaignRecipient[], businesses: Business[]): PostcardCohortInput {
  return {
    postcards,
    recipientsById: new Map(recipients.map((r) => [r.campaignRecipientId, r])),
    businessesById: new Map(businesses.map((b) => [b.businessId, b])),
  };
}

describe('attributePostcardOutcomes', () => {
  it('a fully-converted single postcard counts through every stage', () => {
    const business = makeBusiness({ status: 'customer', firstPaidAt: '2026-07-15T00:00:00.000Z' });
    const recipient = makeRecipient({ estimatedUniqueScans: 1, totalScans: 1 });
    const postcard = makePostcard();

    const result = attributePostcardOutcomes(buildInput([postcard], [recipient], [business]));

    expect(result.stages.map((s) => [s.key, s.count])).toEqual([
      ['sent', 1],
      ['engaged', 1],
      ['claimed', 1],
      ['signedUp', 1],
      ['paid', 1],
    ]);
    expect(result.overallConversion).toBe(1);
    expect(result.cohortSize).toBe(1);
  });

  it('repeated QR scans of the same postcard still count as exactly 1 engaged, not N — deduped via estimatedUniqueScans', () => {
    const business = makeBusiness();
    const recipient = makeRecipient({ totalScans: 5, estimatedUniqueScans: 1 }); // 5 raw scans, 1 unique visitor
    const postcard = makePostcard();

    const result = attributePostcardOutcomes(buildInput([postcard], [recipient], [business]));

    expect(result.stages.find((s) => s.key === 'engaged')?.count).toBe(1);
  });

  it('a scanned-but-not-claimed business does not count toward claimed/signedUp/paid', () => {
    const business = makeBusiness({ status: 'engaged' });
    const recipient = makeRecipient({ estimatedUniqueScans: 1 });
    const postcard = makePostcard();

    const result = attributePostcardOutcomes(buildInput([postcard], [recipient], [business]));

    expect(result.stages.map((s) => s.count)).toEqual([1, 1, 0, 0, 0]);
  });

  it('a cancelled business still counts as claimed (it was claimed at some point) but not paid', () => {
    const business = makeBusiness({ status: 'cancelled' });
    const recipient = makeRecipient({ estimatedUniqueScans: 1 });
    const postcard = makePostcard();

    const result = attributePostcardOutcomes(buildInput([postcard], [recipient], [business]));

    expect(result.stages.find((s) => s.key === 'claimed')?.count).toBe(1);
    expect(result.stages.find((s) => s.key === 'paid')?.count).toBe(0);
  });

  it('zero postcards sent produces all-zero counts and null conversions, not a divide-by-zero artifact', () => {
    const result = attributePostcardOutcomes(buildInput([], [], []));
    expect(result.stages.every((s) => s.count === 0)).toBe(true);
    expect(result.stages.every((s) => s.conversionFromPrevious === null)).toBe(true);
    expect(result.overallConversion).toBeNull();
  });

  it('Paid is deduped by business — two postcards to the same eventually-paid business count Paid once, not twice', () => {
    const business = makeBusiness({ status: 'customer', firstPaidAt: '2026-07-15T00:00:00.000Z' });
    const recipientA = makeRecipient({ campaignRecipientId: 'recipient_a', estimatedUniqueScans: 1 });
    const recipientB = makeRecipient({ campaignRecipientId: 'recipient_b', estimatedUniqueScans: 1 });
    const postcardA = makePostcard({ postcardId: 'postcard_a', campaignRecipientId: 'recipient_a' });
    const postcardB = makePostcard({ postcardId: 'postcard_b', campaignRecipientId: 'recipient_b' });

    const result = attributePostcardOutcomes(buildInput([postcardA, postcardB], [recipientA, recipientB], [business]));

    expect(result.stages.find((s) => s.key === 'sent')?.count).toBe(2);
    expect(result.stages.find((s) => s.key === 'paid')?.count).toBe(1);
  });

  it('a postcard whose recipient or business cannot be resolved is skipped, not crashed on', () => {
    const postcard = makePostcard({ campaignRecipientId: 'recipient_missing' });
    const result = attributePostcardOutcomes(buildInput([postcard], [], []));
    expect(result.stages.find((s) => s.key === 'sent')?.count).toBe(1); // sent is postcards.length, unconditional
    expect(result.stages.find((s) => s.key === 'engaged')?.count).toBe(0);
  });
});

describe('aggregateTemplatePerformance', () => {
  it('groups by templateVariant and computes rates per group', () => {
    const businessA = makeBusiness({ businessId: 'biz_a', status: 'customer', firstPaidAt: '2026-07-15T00:00:00.000Z', plan: 'basic', billingInterval: 'monthly' });
    const businessB = makeBusiness({ businessId: 'biz_b', status: 'engaged' });
    const recipientA = makeRecipient({ campaignRecipientId: 'recipient_a', businessId: 'biz_a', estimatedUniqueScans: 1 });
    const recipientB = makeRecipient({ campaignRecipientId: 'recipient_b', businessId: 'biz_b', estimatedUniqueScans: 0 });
    const postcardA = makePostcard({ postcardId: 'postcard_a', businessId: 'biz_a', campaignRecipientId: 'recipient_a', templateVariant: 'has_website' });
    const postcardB = makePostcard({ postcardId: 'postcard_b', businessId: 'biz_b', campaignRecipientId: 'recipient_b', templateVariant: 'no_website' });

    const rows = aggregateTemplatePerformance(buildInput([postcardA, postcardB], [recipientA, recipientB], [businessA, businessB]));

    const hasWebsiteRow = rows.find((r) => r.templateVariant === 'has_website')!;
    expect(hasWebsiteRow).toMatchObject({ sent: 1, engaged: 1, claimed: 1, paidCustomers: 1, revenueAttributedCents: 3900 });
    expect(hasWebsiteRow.paidConversion).toBe(1);

    const noWebsiteRow = rows.find((r) => r.templateVariant === 'no_website')!;
    expect(noWebsiteRow).toMatchObject({ sent: 1, engaged: 0, claimed: 0, paidCustomers: 0, revenueAttributedCents: 0 });
  });

  it('falls back to resolvePostcardTemplateVariant(business) when templateVariant was not stamped on the postcard', () => {
    const business = makeBusiness({ websiteUrl: 'https://acme.example.com' }); // resolves to 'has_website'
    const recipient = makeRecipient();
    const postcard = makePostcard({ templateVariant: undefined });

    const rows = aggregateTemplatePerformance(buildInput([postcard], [recipient], [business]));

    expect(rows).toHaveLength(1);
    expect(rows[0].templateVariant).toBe('has_website');
  });

  it('shared-claim tie-break: only the earliest-created recipient gets claimed/paid credit, avoiding double-counting one business across two rows', () => {
    const business = makeBusiness({ status: 'customer', firstPaidAt: '2026-07-20T00:00:00.000Z', plan: 'basic', billingInterval: 'monthly' });
    // Two recipients (different campaigns/templates) shared one claimId for this business.
    const earlierRecipient = makeRecipient({
      campaignRecipientId: 'recipient_early',
      claimId: 'claim_shared',
      estimatedUniqueScans: 1,
      createdAt: '2026-06-01T00:00:00.000Z',
    });
    const laterRecipient = makeRecipient({
      campaignRecipientId: 'recipient_late',
      claimId: 'claim_shared',
      estimatedUniqueScans: 1,
      createdAt: '2026-06-15T00:00:00.000Z',
    });
    const earlierPostcard = makePostcard({ postcardId: 'postcard_early', campaignRecipientId: 'recipient_early', templateVariant: 'has_website' });
    const laterPostcard = makePostcard({ postcardId: 'postcard_late', campaignRecipientId: 'recipient_late', templateVariant: 'no_website' });

    const rows = aggregateTemplatePerformance(buildInput([earlierPostcard, laterPostcard], [earlierRecipient, laterRecipient], [business]));

    const earlyRow = rows.find((r) => r.templateVariant === 'has_website')!;
    const lateRow = rows.find((r) => r.templateVariant === 'no_website')!;

    // Both rows show the postcard as sent/engaged (that's real, per-recipient activity)...
    expect(earlyRow.sent).toBe(1);
    expect(lateRow.sent).toBe(1);
    // ...but only the earlier recipient gets claimed/paid credit for the shared outcome.
    expect(earlyRow.claimed).toBe(1);
    expect(earlyRow.paidCustomers).toBe(1);
    expect(lateRow.claimed).toBe(0);
    expect(lateRow.paidCustomers).toBe(0);
  });

  it('a recipient with no claimId (a custom-destination recipient) is always credited on its own', () => {
    const business = makeBusiness({ status: 'claimed' });
    const recipient = makeRecipient({ claimId: undefined, destinationType: 'custom', destinationUrl: 'https://example.com', estimatedUniqueScans: 1 });
    const postcard = makePostcard();

    const rows = aggregateTemplatePerformance(buildInput([postcard], [recipient], [business]));

    expect(rows[0].claimed).toBe(1);
  });
});

describe('pickBestPerformingTemplate', () => {
  function makeRow(overrides: Partial<TemplatePerformanceRow> = {}): TemplatePerformanceRow {
    return {
      templateVariant: 'has_website',
      sent: 25,
      engaged: 10,
      engagementRate: 0.4,
      claimed: 5,
      claimRate: 0.2,
      paidCustomers: 2,
      paidConversion: 0.08,
      revenueAttributedCents: 7800,
      ...overrides,
    };
  }

  it('declares no winner below the sample-size threshold', () => {
    const rows = [makeRow({ sent: 24 })];
    expect(pickBestPerformingTemplate(rows, 25)).toEqual({ status: 'insufficient_data' });
  });

  it('declares a winner at exactly the sample-size threshold', () => {
    const rows = [makeRow({ sent: 25 })];
    const result = pickBestPerformingTemplate(rows, 25);
    expect(result.status).toBe('ok');
  });

  it('picks the highest paidConversion among eligible rows', () => {
    const rows = [
      makeRow({ templateVariant: 'has_website', sent: 30, paidConversion: 0.1 }),
      makeRow({ templateVariant: 'no_website', sent: 30, paidConversion: 0.2 }),
    ];
    const result = pickBestPerformingTemplate(rows, 25);
    expect(result.status).toBe('ok');
    expect(result.status === 'ok' && result.row.templateVariant).toBe('no_website');
  });

  it('excludes ineligible rows even if their conversion is higher', () => {
    const rows = [
      makeRow({ templateVariant: 'has_website', sent: 30, paidConversion: 0.05 }),
      makeRow({ templateVariant: 'no_website', sent: 10, paidConversion: 0.9 }), // higher rate, but under threshold
    ];
    const result = pickBestPerformingTemplate(rows, 25);
    expect(result.status).toBe('ok');
    expect(result.status === 'ok' && result.row.templateVariant).toBe('has_website');
  });

  it('breaks a conversion tie by higher sent count', () => {
    const rows = [
      makeRow({ templateVariant: 'has_website', sent: 30, paidConversion: 0.1 }),
      makeRow({ templateVariant: 'no_website', sent: 50, paidConversion: 0.1 }),
    ];
    const result = pickBestPerformingTemplate(rows, 25);
    expect(result.status === 'ok' && result.row.templateVariant).toBe('no_website');
  });

  it('returns insufficient_data for an empty rows array', () => {
    expect(pickBestPerformingTemplate([], 25)).toEqual({ status: 'insufficient_data' });
  });
});

describe('getCancellationReasons', () => {
  it('always returns the not-collected placeholder, never fabricated data', () => {
    expect(getCancellationReasons()).toEqual({ collected: false, breakdown: [] });
  });
});
