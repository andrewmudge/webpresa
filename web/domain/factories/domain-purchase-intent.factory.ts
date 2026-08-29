import type { DomainPurchaseIntent } from '@/domain/models/domain-purchase-intent';
import { DomainPurchaseIntentSchema } from '@/domain/schemas/domain-purchase-intent.schema';
import { generateId, nowIso } from './utils';

/** Matches Storefront's own documented query-string session lifetime (7 days). */
const TTL_SECONDS = 7 * 24 * 60 * 60;

export interface CreateDomainPurchaseIntentInput {
  businessId: string;
  userId: string;
}

/** Creates a fresh `'pending'` DomainPurchaseIntent — the caller passes `intentId` as Storefront's `extuserid` next. */
export function createDomainPurchaseIntent(input: CreateDomainPurchaseIntentInput): DomainPurchaseIntent {
  const nowSeconds = Math.floor(Date.now() / 1000);

  const record: DomainPurchaseIntent = {
    intentId: generateId('dpi_'),
    businessId: input.businessId,
    userId: input.userId,
    status: 'pending',
    ttl: nowSeconds + TTL_SECONDS,
    createdAt: nowIso(),
  };

  DomainPurchaseIntentSchema.parse(record);
  return record;
}
