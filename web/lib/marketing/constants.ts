/**
 * MVP has exactly one drip campaign — "Postcard Follow-Up" — keyed by a
 * fixed constant id rather than a generated one, mirroring the "natural
 * key, no race" reasoning `DomainConnections`/`CustomerBillingProfiles`
 * already use (`infra/lib/stacks/data-stack.ts`). A generated id plus a
 * lookup-by-name would let two concurrent `ensureMarketingCampaignExists()`
 * calls each create a row; a fixed id makes get-or-create trivially safe.
 */
export const MARKETING_CAMPAIGN_ID = 'mktgcampaign_postcard_followup';

export const MARKETING_CAMPAIGN_NAME = 'Postcard Follow-Up';
