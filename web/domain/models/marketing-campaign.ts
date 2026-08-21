import type { MutableTimestampedRecord } from './common';

/**
 * A drip-email campaign definition (Marketing stage). MVP has exactly one
 * campaign — "Postcard Follow-Up" — keyed by a fixed constant id (see
 * `lib/marketing/constants.ts`, `MARKETING_CAMPAIGN_ID`), not a generated
 * one, the same "natural key, no race" reasoning `DomainConnections`/
 * `CustomerBillingProfiles` already use in `infra/lib/stacks/data-stack.ts`.
 * Lazily get-or-created on first read via `ensureMarketingCampaignExists()`
 * (`lib/marketing/campaign.ts`) — CDK never seeds table data in this repo.
 *
 * `status` is the global kill switch: while `'disabled'`, no new
 * `MarketingOutreach` enrollments are created and no scheduled email is
 * ever sent, checked fresh by `checkMarketingEligibility` on every attempt
 * — never just at enrollment time.
 */
export const MARKETING_CAMPAIGN_STATUSES = ['enabled', 'disabled'] as const;
export type MarketingCampaignStatus = (typeof MARKETING_CAMPAIGN_STATUSES)[number];

export interface MarketingCampaign extends MutableTimestampedRecord {
  marketingCampaignId: string;
  name: string;
  status: MarketingCampaignStatus;
  /** Admin actorId of whoever last toggled `status`, if ever. */
  updatedBy?: string;
}
