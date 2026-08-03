'use server';

import { getSession } from '@/lib/auth/session';
import { getBusinessById } from '@/lib/db/businesses';
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
  destinationUrl: string;
  destinationLabel?: string;
}

/** Generates a fresh `campaignCode` server-side — the caller never supplies one. */
export async function addCampaignRecipientAction(campaignId: string, input: AddCampaignRecipientInput): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const campaign = await getCampaignById(campaignId);
  if (!campaign) return { error: 'Campaign not found.' };

  const businessId = input.businessId.trim();
  const destinationUrl = input.destinationUrl.trim();
  const destinationLabel = input.destinationLabel?.trim();

  if (!businessId) return { error: 'Select a business.' };
  if (!parseAbsoluteHttpUrl(destinationUrl)) return { error: 'Destination must be a valid http(s) URL.' };

  const business = await getBusinessById(businessId);
  if (!business) return { error: 'Business not found.' };

  const recipient = createCampaignRecipient({
    campaignId,
    businessId,
    campaignCode: generateCampaignCode(),
    destinationUrl,
    ...(destinationLabel && { destinationLabel }),
  });
  await putCampaignRecipient(recipient);

  return {};
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
