import type { Postcard, PostcardProvider, PostcardTemplateVariant } from '@/domain/models/postcard';
import { PostcardSchema } from '@/domain/schemas/postcard.schema';
import { generateId, nowIso } from './utils';

export interface CreatePostcardInput {
  businessId: string;
  previewId: string;
  provider: PostcardProvider;
  /** The CampaignRecipient this postcard is being generated for. Absent for a single-postcard test send. */
  campaignRecipientId?: string;
  /** The template resolved for this business at creation time — see
   *  `Postcard.templateVariant`'s doc comment. Callers should pass
   *  `resolvePostcardTemplateVariant(business)` (`lib/postcards/template.ts`),
   *  not compute it here, since this factory has no access to `Business`. */
  templateVariant?: PostcardTemplateVariant;
}

/**
 * Create a new Postcard record in `'pending'` status, with no rendered
 * artifacts yet — those are populated by a later rendering step (Stage 22,
 * Phase 2), not at creation.
 *
 * The provider integration layer is responsible for submitting the
 * postcard job and updating `providerPostcardId`, `status`, `mailedAt`,
 * and `deliveredAt` as the physical mail progresses.
 */
export function createPostcard(input: CreatePostcardInput): Postcard {
  const now = nowIso();

  const record: Postcard = {
    postcardId: generateId('postcard_'),
    businessId: input.businessId,
    previewId: input.previewId,
    ...(input.campaignRecipientId !== undefined && { campaignRecipientId: input.campaignRecipientId }),
    ...(input.templateVariant !== undefined && { templateVariant: input.templateVariant }),
    provider: input.provider,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  PostcardSchema.parse(record);
  return record;
}
