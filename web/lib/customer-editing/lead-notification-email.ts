import 'server-only';
import { z } from 'zod';
import { updateBusiness } from '@/lib/db/businesses';

export type UpdateLeadNotificationEmailState = { message?: string } | undefined;

const LeadNotificationEmailSchema = z.string().email('Enter a valid email address');

/**
 * Updates `Business.leadNotificationEmail` — the private lead-routing
 * inbox `lib/leads/notify.ts` sends to, deliberately separate from the
 * public `email` field. Always requires a real email; there is no
 * "clear it back to unset" path here (`updateBusiness`'s `SET`-only
 * `UpdateCommand` can't safely remove an attribute by passing `undefined`
 * — see `lib/db/businesses.ts`), which is fine since the only two callers
 * (the onboarding step and Settings → Notifications) always have a
 * concrete address to save.
 *
 * Same trivial single-field `updateBusiness()` pattern as
 * `updateCustomerDraftNoticePreference` — no auth/ownership check itself;
 * the caller must call `requireOnboardingAccess()`/`requireEditAccess()` first.
 */
export async function updateCustomerLeadNotificationEmail(
  businessId: string,
  email: string,
): Promise<UpdateLeadNotificationEmailState> {
  const parsed = LeadNotificationEmailSchema.safeParse(email);
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? 'Enter a valid email address.' };
  }

  try {
    await updateBusiness(businessId, { leadNotificationEmail: parsed.data });
  } catch (err) {
    console.error('Failed to update lead notification email:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save changes. Please try again.' };
  }
  return undefined;
}
