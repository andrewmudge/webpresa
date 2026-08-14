import 'server-only';
import { getBusinessesByOwnerUserId } from '@/lib/db/businesses';
import { deleteCustomerBillingProfile } from '@/lib/db/customer-billing';
import { deleteCustomerAccount as deleteCognitoUser } from '@/lib/auth/customer-cognito';
import { deleteCustomerWebsite } from './delete-website';
import { log } from '@/lib/logging/log';

export type DeleteAccountState = { message?: string } | undefined;

const BLOCKING_SUBSCRIPTION_STATUSES = new Set(['active', 'past_due']);

/**
 * Permanent, whole-account delete (Settings, Danger Zone). A customer may
 * own several businesses (Stage 17/18's "one Stripe Customer per Cognito
 * customer" model) — this tears down every one of them, not just the
 * business the Settings page happened to be opened from.
 *
 * **Blocks entirely if any owned business has an active or past_due
 * subscription** — deliberately stricter than `deleteCustomerWebsite`
 * (which allows deleting one website with an active subscription, since
 * the customer keeps their login and can still cancel via the Billing
 * page's Stripe Customer Portal afterward). Account deletion destroys the
 * Cognito login itself; if it proceeded first, a customer with an active
 * subscription would lose the only way they have to reach the Portal and
 * stop future charges. No subscription-cancellation API call exists
 * anywhere in this codebase (see `deleteCustomerWebsite`'s doc comment) —
 * cancellation must happen first, through the existing Portal, while the
 * customer can still sign in.
 *
 * Cascade order: every owned business's full website cascade (reusing
 * `deleteCustomerWebsite`'s existing previews/scans/postcards/claims/
 * domain/S3 teardown unchanged) → the `CustomerBillingProfile` mapping row
 * → the Cognito user itself, last, since it's the one irreversible step a
 * failed retry can no longer be authenticated to attempt again.
 */
export async function deleteCustomerAccount(sub: string): Promise<DeleteAccountState> {
  try {
    const businesses = await getBusinessesByOwnerUserId(sub);

    const blocking = businesses.filter((b) => b.subscriptionStatus && BLOCKING_SUBSCRIPTION_STATUSES.has(b.subscriptionStatus));
    if (blocking.length > 0) {
      return {
        message: `Cancel your active subscription${blocking.length > 1 ? 's' : ''} first: ${blocking.map((b) => b.name).join(', ')} — from each business's Subscription page.`,
      };
    }

    for (const business of businesses) {
      const result = await deleteCustomerWebsite(business.businessId, sub);
      if (result?.message) {
        return { message: `Failed to delete "${business.name}": ${result.message}` };
      }
    }

    await deleteCustomerBillingProfile(sub);

    const cognitoResult = await deleteCognitoUser(sub);
    if (!cognitoResult.ok) {
      return { message: 'Your data was deleted, but we could not close your login. Please contact support.' };
    }

    // Stage 25 — destructive-action audit event, after the full cascade succeeds.
    log({ event: 'customer.account.deleted', component: 'customer-editing', operation: 'delete_account', actorId: sub });
  } catch (err) {
    console.error('Failed to delete customer account:', err instanceof Error ? err.message : err);
    return { message: 'Failed to delete account. Please try again.' };
  }

  return undefined;
}
