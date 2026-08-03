import { z } from 'zod';
import { DEVICE_CLASSES } from '@/domain/models/scan-hit';
import { IsoTimestampSchema } from './common.schema';
import { CampaignCodeSchema } from './campaign-recipient.schema';

export const ScanHitSchema = z.object({
  campaignRecipientId: z.string().regex(/^recipient_/),
  sortKey: z.string().regex(/^HIT#/),
  campaignCode: CampaignCodeSchema,
  businessId: z.string().regex(/^biz_/),
  destinationUrl: z.string().url(),
  /** Hex-encoded SHA-256 — 64 hex characters. */
  visitorFingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  userAgent: z.string().max(500),
  /** Raw `Referer` header value — not always a well-formed URL (e.g. `android-app://...`), so plain bounded text, not `.url()`. */
  referrer: z.string().max(2000).optional(),
  deviceClass: z.enum(DEVICE_CLASSES),
  browserFamily: z.string().max(100).optional(),
  operatingSystem: z.string().max(100).optional(),
  createdAt: IsoTimestampSchema,
});

export type ScanHitSchemaInput = z.input<typeof ScanHitSchema>;
