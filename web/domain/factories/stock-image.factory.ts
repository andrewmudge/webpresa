import type { Industry } from '@/domain/constants/industries';
import type { StockImage, StockImageAsset, StockImageKind, StockHeroVariant } from '@/domain/models/stock-image';
import { StockImageSchema } from '@/domain/schemas/stock-image.schema';
import { generateId, nowIso } from './utils';

export interface CreateStockImageInput {
  kind: StockImageKind;
  /** Required for `kind: 'hero'`; must be omitted for `kind: 'general'`. */
  variant?: StockHeroVariant;
  /** Absent = the general/uncategorized pool. */
  industry?: Industry;
  image: StockImageAsset;
  isDefault?: boolean;
  uploadedBy?: string;
}

/**
 * Create a new StockImage record — exactly one independently-uploaded
 * image, never paired with another. See `StockImageSchema`'s doc comment
 * for the `kind`/`variant` coupling rule.
 */
export function createStockImage(input: CreateStockImageInput): StockImage {
  const now = nowIso();

  const record: StockImage = {
    stockImageId: generateId('stock_'),
    kind: input.kind,
    ...(input.variant !== undefined && { variant: input.variant }),
    ...(input.industry !== undefined && { industry: input.industry }),
    image: input.image,
    status: 'active',
    isDefault: input.isDefault ?? false,
    ...(input.uploadedBy !== undefined && { uploadedBy: input.uploadedBy }),
    createdAt: now,
    updatedAt: now,
  };

  StockImageSchema.parse(record);
  return record;
}
