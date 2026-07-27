import { z } from 'zod';
import { INDUSTRIES } from '@/domain/constants/industries';
import { STOCK_IMAGE_KINDS, STOCK_IMAGE_STATUSES } from '@/domain/models/stock-image';
import { IsoTimestampSchema } from './common.schema';

export const StockImageVariantSchema = z.object({
  s3Key: z.string().min(1),
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

/**
 * Runtime validation schema for the StockImage record.
 *
 * `mobile` is always optional, even for `kind: 'hero'` — desktop and mobile
 * are independent uploads (an admin may upload only a desktop image, only a
 * mobile image, or both; neither is ever derived/cropped from the other).
 * When a `kind: 'hero'` set has no `mobile`, the auto hero-pick's mobile
 * tier falls back to reusing `desktop` — see `lib/image/resolve-hero-image.ts`.
 */
export const StockImageSchema = z.object({
  stockImageId: z
    .string()
    .regex(/^stock_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
  kind: z.enum(STOCK_IMAGE_KINDS),
  industry: z.enum(INDUSTRIES).optional(),
  desktop: StockImageVariantSchema,
  mobile: StockImageVariantSchema.optional(),
  status: z.enum(STOCK_IMAGE_STATUSES),
  isDefault: z.boolean(),
  uploadedBy: z.string().optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export type StockImageSchemaInput = z.input<typeof StockImageSchema>;
