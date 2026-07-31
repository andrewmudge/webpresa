import 'server-only';
import { updateBusiness } from '@/lib/db/businesses';

/**
 * The durable, cross-device half of the "draft changes" toast preference —
 * see `Business.draftChangesNoticeEnabled`'s doc comment for how this
 * differs from the toast's own browser-local "already shown once" state.
 * A single-field `updateBusiness()` partial merge, same trivial pattern as
 * `updateCustomerLogo`.
 */
export async function updateCustomerDraftNoticePreference(businessId: string, enabled: boolean): Promise<void> {
  await updateBusiness(businessId, { draftChangesNoticeEnabled: enabled });
}
