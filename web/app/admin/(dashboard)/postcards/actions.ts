'use server';

import { getSession } from '@/lib/auth/session';
import { getBusinessById } from '@/lib/db/businesses';
import { getCampaignRecipientById, linkPostcardToCampaignRecipient } from '@/lib/db/campaign-recipients';
import { getPostcardByCampaignRecipientId, putPostcard, approvePostcard } from '@/lib/db/postcards';
import { createPostcard } from '@/domain/factories/postcard.factory';

/**
 * Admin postcard management (Stage 22). Manual-only, one postcard at a
 * time — generation is reachable per-recipient from the existing Stage 21
 * campaign admin UI, not a separate bulk-selection flow (bulk campaign
 * execution stays deferred). No automatic approval or submission exists.
 */

export interface CreatePostcardResult {
  error?: string;
  postcardId?: string;
}

/**
 * Generates a new Postcard for one CampaignRecipient — the recipient *is*
 * "one mailed piece" (Stage 21); this Postcard becomes the record of its
 * physical rendering and fulfillment. A recipient can have at most one
 * Postcard.
 */
export async function createPostcardAction(campaignRecipientId: string): Promise<CreatePostcardResult> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const recipient = await getCampaignRecipientById(campaignRecipientId);
  if (!recipient) return { error: 'Campaign recipient not found.' };

  if (recipient.postcardId) {
    return { error: 'This recipient already has a postcard.', postcardId: recipient.postcardId };
  }

  const existing = await getPostcardByCampaignRecipientId(campaignRecipientId);
  if (existing) return { error: 'This recipient already has a postcard.', postcardId: existing.postcardId };

  const business = await getBusinessById(recipient.businessId);
  if (!business) return { error: 'Business not found.' };
  if (!business.currentPreviewId) return { error: 'This business has no generated website preview yet.' };

  const postcard = createPostcard({
    businessId: business.businessId,
    previewId: business.currentPreviewId,
    provider: 'lob',
    campaignRecipientId,
  });
  await putPostcard(postcard);
  await linkPostcardToCampaignRecipient(campaignRecipientId, postcard.postcardId);

  return { postcardId: postcard.postcardId };
}

/**
 * Records explicit admin approval. Approval only unlocks submission (Phase
 * 4, not yet built) — it never triggers mailing by itself. No automatic
 * approval path exists.
 */
export async function approvePostcardAction(postcardId: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  await approvePostcard(postcardId, session.sub);
  return {};
}
