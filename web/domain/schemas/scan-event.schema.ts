import { z } from 'zod';
import {
  SCAN_STATUSES,
  SCAN_PROVIDERS,
  SCAN_OPERATIONS,
  SCAN_FAILURE_CATEGORIES,
  SCAN_TARGET_TYPES,
} from '@/domain/models/scan-event';
import { IsoTimestampSchema, ScoreSchema } from './common.schema';
import { ScanImageAssetSchema } from './scan-image.schema';
import { WebsiteDeterministicMetricsSchema, WebsiteAssessmentSchema } from './website-assessment.schema';

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

const ViewportCaptureResultSchema = z.object({
  status: z.enum(['completed', 'failed']),
  storageKey: z.string().max(500).optional(),
  failureCategory: z.enum(SCAN_FAILURE_CATEGORIES).optional(),
  failureMessage: z.string().max(500).optional(),
});

const ScanCaptureResultsSchema = z.object({
  desktop: ViewportCaptureResultSchema.optional(),
  mobile: ViewportCaptureResultSchema.optional(),
});

export const ScanEventSchema = z.object({
  scanId: z
    .string()
    .regex(/^scan_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
  businessId: z.string().regex(/^biz_/),
  provider: z.enum(SCAN_PROVIDERS),
  operation: z.enum(SCAN_OPERATIONS),
  status: z.enum(SCAN_STATUSES),
  sourceUrl: z.string().url().optional(),
  finalUrl: z.string().url().optional(),
  httpStatus: z.number().int().min(100).max(599).optional(),
  failureCategory: z.enum(SCAN_FAILURE_CATEGORIES).optional(),
  failureMessage: z.string().max(500).optional(),
  attempt: z.number().int().min(1),
  retryOfScanId: z
    .string()
    .regex(/^scan_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    .optional(),
  rawArtifactKey: z.string().max(500).optional(),
  extractedArtifactKey: z.string().max(500).optional(),
  images: z.array(ScanImageAssetSchema).max(20).optional(),
  generatedPreviewId: z.string().optional(),
  storageKeys: ScanStorageKeysSchema.optional(),
  targetType: z.enum(SCAN_TARGET_TYPES).optional(),
  previewId: z
    .string()
    .regex(/^preview_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    .optional(),
  captureResults: ScanCaptureResultsSchema.optional(),
  scores: ScanScoresSchema.optional(),
  deterministicMetrics: WebsiteDeterministicMetricsSchema.optional(),
  assessment: WebsiteAssessmentSchema.optional(),
  aiResponseArtifactKey: z.string().max(500).optional(),
  aiMetadata: z
    .object({
      model: z.string().min(1).max(100),
      promptVersion: z.string().min(1).max(50),
    })
    .optional(),
  startedAt: IsoTimestampSchema.optional(),
  completedAt: IsoTimestampSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
