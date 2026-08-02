import 'server-only';
import { updateBusiness } from '@/lib/db/businesses';

export type UpdateNotificationPreferenceState = { message?: string } | undefined;

/**
 * The durable, cross-device half of the "draft changes" toast preference —
 * see `Business.draftChangesNoticeEnabled`'s doc comment for how this
 * differs from the toast's own browser-local "already shown once" state.
 * A single-field `updateBusiness()` partial merge, same trivial pattern as
 * `updateCustomerLogo`. Returns a small state object (rather than `void`)
 * so Settings' Notifications card can show a real error state — the
 * previous fire-and-forget call site (`DraftChangesNotice.tsx`) still
 * ignores the return value, which remains valid.
 */
export async function updateCustomerDraftNoticePreference(
  businessId: string,
  enabled: boolean,
): Promise<UpdateNotificationPreferenceState> {
  try {
    await updateBusiness(businessId, { draftChangesNoticeEnabled: enabled });
  } catch (err) {
    console.error('Failed to update notification preference:', err instanceof Error ? err.message : err);
    return { message: 'Failed to save preferences. Please try again.' };
  }
  return undefined;
}
