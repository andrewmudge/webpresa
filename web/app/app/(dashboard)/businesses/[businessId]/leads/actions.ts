'use server';
import { requireCustomerSession, requireBusinessOwnership, computeBusinessAccessMode, hasPlanCapability } from '@/lib/auth/customer-authorization';
import { markCustomerLeadRead, archiveCustomerLead, type UpdateLeadState } from '@/lib/customer-editing/lead-actions';

/**
 * Session + ownership + Growth-plan-entitlement check, shared by both
 * mutations below — mirrors `requireEditAccess` in the parent
 * `businesses/[businessId]/actions.ts`, except gated on `hasPlanCapability`
 * rather than `requireActiveSubscription`, since lead capture specifically
 * requires the Growth plan, not just any active subscription.
 */
async function requireLeadEditAccess(businessId: string): Promise<void> {
  const session = await requireCustomerSession();
  const business = await requireBusinessOwnership(session.sub, businessId);
  const access = computeBusinessAccessMode(business);
  if (!hasPlanCapability(access, 'lead_capture')) {
    throw new Error('Lead capture is not included in this business plan.');
  }
}

export async function markLeadReadActionCustomer(businessId: string, leadId: string): Promise<UpdateLeadState> {
  await requireLeadEditAccess(businessId);
  return markCustomerLeadRead(leadId, businessId);
}

export async function archiveLeadActionCustomer(businessId: string, leadId: string): Promise<UpdateLeadState> {
  await requireLeadEditAccess(businessId);
  return archiveCustomerLead(leadId, businessId);
}
