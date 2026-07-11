import { z } from 'zod';
import { SCAN_STATUSES } from '@/domain/models/scan-event';
import { IsoTimestampSchema, ScoreSchema } from './common.schema';

const ScanScoresSchema = z.object({
  overall: ScoreSchema.optional(),
  design: ScoreSchema.optional(),
  mobile: ScoreSchema.optional(),
  seo: ScoreSchema.optional(),
  performance: ScoreSchema.optional(),
  accessibility: ScoreSchema.optional(),
});

const ScanStorageKeysSchema = z.object({
  screenshotKey: z.string().optional(),
  htmlSnapshotKey: z.string().optional(),
  lighthouseKey: z.string().optional(),
});

export const ScanEventSchema = z.object({
  scanId: z
    .string()
    .regex(/^scan_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
  businessId: z.string().regex(/^biz_/),
  status: z.enum(SCAN_STATUSES),
  sourceUrl: z.string().url(),
  storageKeys: ScanStorageKeysSchema.optional(),
  scores: ScanScoresSchema.optional(),
  failureReason: z.string().optional(),
  startedAt: IsoTimestampSchema,
  completedAt: IsoTimestampSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
