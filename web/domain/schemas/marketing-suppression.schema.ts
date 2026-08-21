import { z } from 'zod';
import { MARKETING_SUPPRESSION_REASONS } from '@/domain/models/marketing-suppression';
import { IsoTimestampSchema } from './common.schema';

export const MarketingSuppressionSchema = z.object({
  emailNormalized: z.string().email(),
  businessId: z.string().regex(/^biz_/).optional(),
  reason: z.enum(MARKETING_SUPPRESSION_REASONS),
  suppressedAt: IsoTimestampSchema,
  suppressedBy: z.string().min(1).optional(),
  createdAt: IsoTimestampSchema,
});
