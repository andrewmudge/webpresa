import type { Industry } from '@/domain/constants/industries';
import type { StockImage, StockImageVariant } from '@/domain/models/stock-image';
import { StockImageSchema } from '@/domain/schemas/stock-image.schema';
import { generateId, nowIso } from './utils';

export interface CreateStockHeroSetInput {
  industry: Industry;
  desktop: StockImageVariant;
  /** Optional — a hero set may have only a desktop image. See `StockImageSchema`'s doc comment. */
  mobile?: StockImageVariant;
  isDefault?: boolean;
  uploadedBy?: string;
}

/** Create a new `kind: 'hero'` StockImage — a desktop image and, optionally, an independent mobile image. */
export function createStockHeroSet(input: CreateStockHeroSetInput): StockImage {
  const now = nowIso();

  const record: StockImage = {
    stockImageId: generateId('stock_'),
    kind: 'hero',
    industry: input.industry,
    desktop: input.desktop,
    ...(input.mobile !== undefined && { mobile: input.mobile }),
    status: 'active',
    isDefault: input.isDefault ?? false,
    ...(input.uploadedBy !== undefined && { uploadedBy: input.uploadedBy }),
    createdAt: now,
    updatedAt: now,
  };

  StockImageSchema.parse(record);
  return record;
}

export interface CreateGeneralStockImageInput {
  /** Absent = the general/uncategorized pool. */
  industry?: Industry;
  desktop: StockImageVariant;
  isDefault?: boolean;
  uploadedBy?: string;
}

/** Create a new `kind: 'general'` StockImage — a single standalone image, no mobile companion. */
export function createGeneralStockImage(input: CreateGeneralStockImageInput): StockImage {
  const now = nowIso();

  const record: StockImage = {
    stockImageId: generateId('stock_'),
    kind: 'general',
    ...(input.industry !== undefined && { industry: input.industry }),
    desktop: input.desktop,
    status: 'active',
    isDefault: input.isDefault ?? false,
    ...(input.uploadedBy !== undefined && { uploadedBy: input.uploadedBy }),
    createdAt: now,
    updatedAt: now,
  };

  StockImageSchema.parse(record);
  return record;
}
