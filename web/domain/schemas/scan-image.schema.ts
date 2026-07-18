import { z } from 'zod';
import { WEBSITE_IMAGE_ROLES, WEBSITE_IMAGE_STATUSES } from '@/domain/models/scan-image';
import { UrlOrPathSchema } from './common.schema';

export const ScanImageAssetSchema = z.object({
  imageId: z.string().min(1),
  url: UrlOrPathSchema.optional(),
  role: z.enum(WEBSITE_IMAGE_ROLES),
  status: z.enum(WEBSITE_IMAGE_STATUSES),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  sizeBytes: z.number().int().positive().optional(),
  contentType: z.string().max(100).optional(),
  originalUrl: z.string().url(),
  s3Key: z.string().max(500).optional(),
  note: z.string().max(300).optional(),
  promotedPhotoUrl: UrlOrPathSchema.optional(),
});
