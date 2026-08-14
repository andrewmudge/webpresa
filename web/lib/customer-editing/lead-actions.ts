import 'server-only';
import { getLeadById, updateLeadStatus } from '@/lib/db/leads';

/**
 * Stage 25 — performs no auth/ownership check of `businessId` itself
 * (`requireLeadOwnedByBusiness` below only checks the lead-to-business
 * pairing); the caller (the customer-scoped Server Action) must call
 * `requireBusinessAccess()`/`requireBusinessOwnership()` on `businessId`
 * first.
 */
export type UpdateLeadState = { message?: string } | undefined;

/** Defense against a leadId for a different business slipping through — never trust the caller's businessId/leadId pairing alone. */
async function requireLeadOwnedByBusiness(leadId: string, businessId: string) {
  const lead = await getLeadById(leadId);
  if (!lead || lead.businessId !== businessId) return null;
  return lead;
}

export async function markCustomerLeadRead(leadId: string, businessId: string): Promise<UpdateLeadState> {
  const lead = await requireLeadOwnedByBusiness(leadId, businessId);
  if (!lead) return { message: 'Lead not found.' };
  if (lead.status === 'new') await updateLeadStatus(leadId, 'read');
  return undefined;
}

/** No customer-facing delete exists — archive is the only terminal action available to a business owner. */
export async function archiveCustomerLead(leadId: string, businessId: string): Promise<UpdateLeadState> {
  const lead = await requireLeadOwnedByBusiness(leadId, businessId);
  if (!lead) return { message: 'Lead not found.' };
  await updateLeadStatus(leadId, 'archived');
  return undefined;
}
