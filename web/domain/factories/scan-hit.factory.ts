import type { ScanHit, DeviceClass } from '@/domain/models/scan-hit';
import { ScanHitSchema } from '@/domain/schemas/scan-hit.schema';
import { nowIso } from './utils';

export interface CreateScanHitInput {
  campaignRecipientId: string;
  campaignCode: string;
  businessId: string;
  destinationUrl: string;
  visitorFingerprint: string;
  userAgent: string;
  referrer?: string;
  deviceClass: DeviceClass;
  browserFamily?: string;
  operatingSystem?: string;
}

/**
 * Create a new, permanent ScanHit record for one valid `/r/[campaignCode]`
 * redirect — never updated after creation (see `domain/models/scan-hit.ts`).
 */
export function createScanHit(input: CreateScanHitInput): ScanHit {
  const now = nowIso();

  const record: ScanHit = {
    campaignRecipientId: input.campaignRecipientId,
    sortKey: `HIT#${now}#${crypto.randomUUID().slice(0, 8)}`,
    campaignCode: input.campaignCode,
    businessId: input.businessId,
    destinationUrl: input.destinationUrl,
    visitorFingerprint: input.visitorFingerprint,
    userAgent: input.userAgent,
    ...(input.referrer !== undefined && { referrer: input.referrer }),
    deviceClass: input.deviceClass,
    ...(input.browserFamily !== undefined && { browserFamily: input.browserFamily }),
    ...(input.operatingSystem !== undefined && { operatingSystem: input.operatingSystem }),
    createdAt: now,
  };

  ScanHitSchema.parse(record);
  return record;
}
