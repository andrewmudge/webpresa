import type { Postcard, PostcardProvider } from '@/domain/models/postcard';
import { PostcardSchema } from '@/domain/schemas/postcard.schema';
import { generateId, nowIso } from './utils';

export interface CreatePostcardInput {
  businessId: string;
  previewId: string;
  provider: PostcardProvider;
  campaignCode: string;
  /** Full URL the QR code on the postcard resolves to. */
  qrDestination: string;
}

/**
 * Create a new Postcard record in `'pending'` status.
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
    provider: input.provider,
    campaignCode: input.campaignCode,
    qrDestination: input.qrDestination,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  PostcardSchema.parse(record);
  return record;
}
