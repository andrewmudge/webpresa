import type { Lead } from '@/domain/models/lead';
import { LeadSchema } from '@/domain/schemas/lead.schema';
import { generateId, nowIso } from './utils';

export interface CreateLeadInput {
  businessId: string;
  previewId?: string;
  name: string;
  phone?: string;
  email?: string;
  serviceNeeded?: string;
  message?: string;
  submitterIpHash: string;
  fingerprint: string;
}

/**
 * Create a new Lead record — always `status: 'new'`, `notificationStatus:
 * 'pending'`, `notificationAttempts: 0`. The SES send is attempted by the
 * caller (`lib/leads/notify.ts`) after this record is durably persisted,
 * never before.
 */
export function createLead(input: CreateLeadInput): Lead {
  const now = nowIso();

  const record: Lead = {
    leadId: generateId('lead_'),
    businessId: input.businessId,
    ...(input.previewId !== undefined && { previewId: input.previewId }),
    name: input.name,
    ...(input.phone !== undefined && { phone: input.phone }),
    ...(input.email !== undefined && { email: input.email }),
    ...(input.serviceNeeded !== undefined && { serviceNeeded: input.serviceNeeded }),
    ...(input.message !== undefined && { message: input.message }),
    source: 'request_service_form',
    status: 'new',
    submitterIpHash: input.submitterIpHash,
    fingerprint: input.fingerprint,
    notificationStatus: 'pending',
    notificationAttempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  LeadSchema.parse(record);
  return record;
}
