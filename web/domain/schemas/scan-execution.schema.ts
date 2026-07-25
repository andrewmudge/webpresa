import { z } from 'zod';
import {
  SCAN_WORKFLOW_STATUSES,
  SCAN_WORKFLOW_STEPS,
  SCAN_WORKFLOW_FAILURE_CATEGORIES,
  SCAN_WORKFLOW_PROVIDERS,
  SCAN_WORKFLOW_TRIGGER_SOURCES,
} from '@/domain/models/scan-execution';
import { QUALIFICATION_RESULTS, LEAD_PRIORITIES } from '@/domain/models/website-assessment';
import { IsoTimestampSchema } from './common.schema';

const ScanIdSchema = z.string().regex(/^scan_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

const ScanWorkflowFailureSchema = z.object({
  step: z.enum(SCAN_WORKFLOW_STEPS),
  category: z.enum(SCAN_WORKFLOW_FAILURE_CATEGORIES),
  safeMessage: z.string().max(500),
  provider: z.enum(SCAN_WORKFLOW_PROVIDERS).optional(),
  occurredAt: IsoTimestampSchema,
  attemptCount: z.number().int().min(1),
  retryEligible: z.boolean(),
});

export const ScanExecutionSchema = z.object({
  scanExecutionId: z
    .string()
    .regex(/^scanexec_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
  businessId: z.string().regex(/^biz_/),
  executionArn: z.string().max(2000).optional(),
  executionName: z.string().max(200).optional(),
  status: z.enum(SCAN_WORKFLOW_STATUSES),
  currentStep: z.enum(SCAN_WORKFLOW_STEPS).optional(),
  triggerSource: z.enum(SCAN_WORKFLOW_TRIGGER_SOURCES),
  requestedBy: z.string().min(1).max(200),
  crawlScanId: ScanIdSchema.optional(),
  sourceScreenshotScanId: ScanIdSchema.optional(),
  scoreScanId: ScanIdSchema.optional(),
  previewScreenshotScanId: ScanIdSchema.optional(),
  previewId: z
    .string()
    .regex(/^preview_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    .optional(),
  qualification: z.enum(QUALIFICATION_RESULTS).optional(),
  leadPriority: z.enum(LEAD_PRIORITIES).optional(),
  manualReviewReason: z.string().max(500).optional(),
  attemptNumber: z.number().int().min(1),
  parentScanExecutionId: z
    .string()
    .regex(/^scanexec_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    .optional(),
  rerunReason: z.string().max(500).optional(),
  failure: ScanWorkflowFailureSchema.optional(),
  startedAt: IsoTimestampSchema.optional(),
  completedAt: IsoTimestampSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
