'use server';

import { getSession } from '@/lib/auth/session';
import { getBusinessById } from '@/lib/db/businesses';
import { listClaimsForBusiness, isClaimUsable, putClaim } from '@/lib/db/claims';
import { createClaim } from '@/domain/factories/claim.factory';
import { generateAndHashClaimToken } from '@/lib/claim/token';
import type { CampaignChannel, CampaignStatus } from '@/domain/models/campaign';
import { CAMPAIGN_CHANNELS } from '@/domain/models/campaign';
import type { CampaignRecipientStatus } from '@/domain/models/campaign-recipient';
import { createCampaign } from '@/domain/factories/campaign.factory';
import { createCampaignRecipient } from '@/domain/factories/campaign-recipient.factory';
import { generateCampaignCode } from '@/lib/campaign/code';
import { getCampaignById, putCampaign, updateCampaignStatus } from '@/lib/db/campaigns';
import { putCampaignRecipient, updateCampaignRecipientDestination, updateCampaignRecipientStatus } from '@/lib/db/campaign-recipients';

/**
 * Admin campaign management (Stage 21). Manual-only — there is no
 * automated campaign/recipient creation in this stage (see
 * implementation.md, Stage 21, "Manual MVP").
 */

function parseAbsoluteHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Campaign
// ---------------------------------------------------------------------------

export interface CreateCampaignInput {
  name: string;
  channel: CampaignChannel;
}

export interface CreateCampaignResult {
  error?: string;
  campaignId?: string;
}

export async function createCampaignAction(input: CreateCampaignInput): Promise<CreateCampaignResult> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const name = input.name.trim();
  if (!name) return { error: 'Name is required.' };
  if (!CAMPAIGN_CHANNELS.includes(input.channel)) return { error: 'Invalid channel.' };

  const campaign = createCampaign({ name, channel: input.channel });
  await putCampaign(campaign);

  return { campaignId: campaign.campaignId };
}

export async function updateCampaignStatusAction(campaignId: string, status: CampaignStatus): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const campaign = await getCampaignById(campaignId);
  if (!campaign) return { error: 'Campaign not found.' };

  await updateCampaignStatus(campaignId, status);
  return {};
}

// ---------------------------------------------------------------------------
// CampaignRecipient
// ---------------------------------------------------------------------------

export interface AddCampaignRecipientInput {
  businessId: string;
  /** The exception path — when omitted (the default), the recipient auto-wires into the business's claim flow instead. */
  destinationUrl?: string;
  destinationLabel?: string;
}

export interface AddCampaignRecipientResult {
  error?: string;
  /** The raw claim token — shown once, never persisted, never retrievable again. Present only when a new claim was just generated (never when an existing one was reused). */
  rawToken?: string;
}

/**
 * Generates a fresh `campaignCode` server-side — the caller never supplies
 * one. When `destinationUrl` is omitted, auto-wires the recipient to the
 * business's claim flow (`destinationType: 'claim'`): reuses the business's
 * newest still-usable `Claim` if one exists, otherwise issues a new one
 * exactly the way `generateClaimLinkAction` (business detail page) does.
 * The redirect route (`lib/campaign/resolve-redirect.ts`) resolves the
 * actual claim-intent at scan time via `claimId` — the raw token is never
 * stored on the recipient. A business that's already claimed gets
 * `destinationType: 'claim'` with no `claimId`; the redirect route already
 * knows to just link to the live page in that case.
 */
export async function addCampaignRecipientAction(campaignId: string, input: AddCampaignRecipientInput): Promise<AddCampaignRecipientResult> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const campaign = await getCampaignById(campaignId);
  if (!campaign) return { error: 'Campaign not found.' };

  const businessId = input.businessId.trim();
  if (!businessId) return { error: 'Select a business.' };

  const business = await getBusinessById(businessId);
  if (!business) return { error: 'Business not found.' };

  const destinationUrl = input.destinationUrl?.trim();
  const destinationLabel = input.destinationLabel?.trim();

  if (destinationUrl) {
    if (!parseAbsoluteHttpUrl(destinationUrl)) return { error: 'Destination must be a valid http(s) URL.' };

    const recipient = createCampaignRecipient({
      campaignId,
      businessId,
      campaignCode: generateCampaignCode(),
      destinationType: 'custom',
      destinationUrl,
      ...(destinationLabel && { destinationLabel }),
    });
    await putCampaignRecipient(recipient);
    return {};
  }

  // Default path: auto-wire to the claim flow.
  let claimId: string | undefined;
  let rawToken: string | undefined;

  if (!business.ownerUserId) {
    const existingClaims = await listClaimsForBusiness(businessId);
    const usableClaim = existingClaims.find(isClaimUsable);

    if (usableClaim) {
      claimId = usableClaim.claimId;
    } else {
      const generated = await generateAndHashClaimToken();
      const claim = createClaim({ businessId, tokenHash: generated.tokenHash });
      await putClaim(claim);
      claimId = claim.claimId;
      rawToken = generated.rawToken;
    }
  }
  // else: already claimed — leave claimId unset; the redirect route just
  // links to the live page for a 'claim'-type recipient with no claimId.

  const recipient = createCampaignRecipient({
    campaignId,
    businessId,
    campaignCode: generateCampaignCode(),
    destinationType: 'claim',
    ...(claimId !== undefined && { claimId }),
  });
  await putCampaignRecipient(recipient);

  return { ...(rawToken !== undefined && { rawToken }) };
}

export interface UpdateCampaignRecipientDestinationInput {
  destinationUrl: string;
  destinationLabel?: string;
}

export async function updateCampaignRecipientDestinationAction(
  campaignRecipientId: string,
  input: UpdateCampaignRecipientDestinationInput,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const destinationUrl = input.destinationUrl.trim();
  if (!parseAbsoluteHttpUrl(destinationUrl)) return { error: 'Destination must be a valid http(s) URL.' };

  await updateCampaignRecipientDestination(campaignRecipientId, {
    destinationUrl,
    destinationLabel: input.destinationLabel?.trim() || undefined,
  });
  return {};
}

export async function updateCampaignRecipientStatusAction(
  campaignRecipientId: string,
  status: CampaignRecipientStatus,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  await updateCampaignRecipientStatus(campaignRecipientId, status);
  return {};
}
