import type { MarketingSuppression, MarketingSuppressionReason } from '@/domain/models/marketing-suppression';
import { MarketingSuppressionSchema } from '@/domain/schemas/marketing-suppression.schema';
import { nowIso } from './utils';

export interface CreateMarketingSuppressionInput {
  emailNormalized: string;
  businessId?: string;
  reason: MarketingSuppressionReason;
  /** Admin actorId — required when `reason === 'admin'`. */
  suppressedBy?: string;
}

export function createMarketingSuppression(input: CreateMarketingSuppressionInput): MarketingSuppression {
  const now = nowIso();
  const record: MarketingSuppression = {
    emailNormalized: input.emailNormalized,
    ...(input.businessId !== undefined && { businessId: input.businessId }),
    reason: input.reason,
    suppressedAt: now,
    ...(input.suppressedBy !== undefined && { suppressedBy: input.suppressedBy }),
    createdAt: now,
  };
  MarketingSuppressionSchema.parse(record);
  return record;
}
