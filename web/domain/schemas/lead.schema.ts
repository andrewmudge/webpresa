import { z } from 'zod';
import { LEAD_STATUSES, LEAD_NOTIFICATION_STATUSES, LEAD_SOURCES } from '@/domain/models/lead';
import { IsoTimestampSchema } from './common.schema';

export const LeadSchema = z.object({
  leadId: z.string().regex(/^lead_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
  businessId: z.string().regex(/^biz_/),
  previewId: z.string().regex(/^preview_/).optional(),

  name: z.string().min(1).max(200),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(200).optional(),
  serviceNeeded: z.string().max(200).optional(),
  message: z.string().max(2000).optional(),

  source: z.enum(LEAD_SOURCES),
  status: z.enum(LEAD_STATUSES),

  /** Hex-encoded SHA-256 — 64 hex characters. */
  submitterIpHash: z.string().regex(/^[0-9a-f]{64}$/),
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/),

  notificationStatus: z.enum(LEAD_NOTIFICATION_STATUSES),
  notificationAttempts: z.number().int().min(0),
  lastNotificationAttemptAt: IsoTimestampSchema.optional(),
  lastNotificationError: z.string().max(500).optional(),

  archivedAt: IsoTimestampSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export type LeadSchemaInput = z.input<typeof LeadSchema>;
