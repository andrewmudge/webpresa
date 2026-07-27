import { z } from 'zod';
import { INDUSTRIES } from '@/domain/constants/industries';
import { STOCK_IMAGE_KINDS, STOCK_HERO_VARIANTS, STOCK_IMAGE_STATUSES } from '@/domain/models/stock-image';
import { IsoTimestampSchema } from './common.schema';

export const StockImageAssetSchema = z.object({
  s3Key: z.string().min(1),
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

/**
 * Runtime validation schema for the StockImage record.
 *
 * `variant` is required for `kind: 'hero'` (desktop or mobile) and must be
 * absent for `kind: 'general'` — enforced via `.superRefine` rather than a
 * discriminated union so the shared fields (industry/status/isDefault)
 * don't need duplicating across two branches.
 */
export const StockImageSchema = z
  .object({
    stockImageId: z
      .string()
      .regex(/^stock_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
    kind: z.enum(STOCK_IMAGE_KINDS),
    variant: z.enum(STOCK_HERO_VARIANTS).optional(),
    industry: z.enum(INDUSTRIES).optional(),
    image: StockImageAssetSchema,
    status: z.enum(STOCK_IMAGE_STATUSES),
    isDefault: z.boolean(),
    uploadedBy: z.string().optional(),
    createdAt: IsoTimestampSchema,
    updatedAt: IsoTimestampSchema,
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'hero' && !value.variant) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '"variant" (desktop or mobile) is required for kind: "hero"',
        path: ['variant'],
      });
    }
    if (value.kind === 'general' && value.variant) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '"variant" must be absent for kind: "general"',
        path: ['variant'],
      });
    }
  });

export type StockImageSchemaInput = z.input<typeof StockImageSchema>;
