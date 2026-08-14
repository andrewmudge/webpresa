import 'server-only';
import { getBusinessById, deleteBusinessById } from '@/lib/db/businesses';
import { listPreviewsForBusiness, deletePreviewById } from '@/lib/db/site-previews';
import { listScansForBusiness, deleteScanEventById } from '@/lib/db/scan-events';
import { listPostcardsForBusiness, deletePostcardById } from '@/lib/db/postcards';
import { listClaimsForBusiness, deleteClaimById } from '@/lib/db/claims';
import { listLeadsForBusiness, deleteLeadById } from '@/lib/db/leads';
import { listDomainConnectionsForBusiness, deleteDomainConnectionRecord } from '@/lib/db/domain-connections';
import { removeProjectDomain } from '@/lib/vercel/domains';
import { deleteAsset } from '@/lib/s3/assets';
import { assetKeyFromUrl } from '@/lib/s3/business-assets';
import { log } from '@/lib/logging/log';

export type DeleteWebsiteState = { message?: string } | undefined;

/**
 * Customer-initiated permanent delete (Settings, Danger Zone). Extends the
 * admin's `deleteBusinessAction` cascade (previews/scans/postcards/claims/
 * leads, then the business record — see
 * `app/admin/(dashboard)/businesses/[businessId]/actions.ts`)
 * with the two things that action never touched: the domain connection
 * (Vercel attachment + DynamoDB record, same calls
 * `lib/domains/disconnect.ts`'s admin-only `disconnectDomainConnectionForTesting`
 * already makes) and the business's own S3 photo/logo assets.
 *
 * Deliberately does NOT check or touch `subscriptionStatus`/Stripe — a
 * customer with an active paid subscription is still allowed to delete
 * their own website (the caller already gates this action on
 * `mode === 'full'`, the same entitlement boundary every other mutation on
 * this page uses); this does not cancel their Stripe subscription, which
 * the confirmation modal must say plainly, since no subscription-
 * cancellation call exists anywhere in this codebase yet (only the Stripe
 * Customer Portal, reached separately from the Billing page).
 *
 * Vercel/S3 cleanup is best-effort — logged and swallowed, matching
 * `disconnectDomainConnectionForTesting`'s and
 * `deleteCustomerBusinessPhoto`'s existing precedent — so a transient
 * provider failure can never leave the DynamoDB records un-deletable.
 * Ownership is re-verified against the caller's own `sub` independently of
 * whatever the confirmation modal's client state claimed.
 */
export async function deleteCustomerWebsite(businessId: string, ownerUserId: string): Promise<DeleteWebsiteState> {
  try {
    const business = await getBusinessById(businessId);
    if (!business || business.ownerUserId !== ownerUserId) {
      return { message: 'Website not found.' };
    }

    const [previews, scans, postcards, claims, domainConnections, leads] = await Promise.all([
      listPreviewsForBusiness(businessId),
      listScansForBusiness(businessId),
      listPostcardsForBusiness(businessId),
      listClaimsForBusiness(businessId),
      listDomainConnectionsForBusiness(businessId),
      listLeadsForBusiness(businessId),
    ]);

    await Promise.all(
      domainConnections.map(async (connection) => {
        try {
          await removeProjectDomain(connection.primaryHostname);
        } catch (err) {
          console.error('[deleteCustomerWebsite] Vercel domain removal failed (continuing):', {
            businessId,
            normalizedDomain: connection.normalizedDomain,
            error: err instanceof Error ? err.message : 'unknown',
          });
        }
        await deleteDomainConnectionRecord(connection.normalizedDomain);
      }),
    );

    const assetUrls = [...(business.photoUrls ?? []), ...(business.logoUrl ? [business.logoUrl] : [])];
    await Promise.all(
      assetUrls.map(async (url) => {
        const key = assetKeyFromUrl(url);
        if (!key) return;
        await deleteAsset(key).catch((err) => {
          console.error('[deleteCustomerWebsite] S3 asset delete failed (continuing):', {
            businessId,
            error: err instanceof Error ? err.message : 'unknown',
          });
        });
      }),
    );

    await Promise.all([
      ...previews.map((p) => deletePreviewById(p.previewId)),
      ...scans.map((s) => deleteScanEventById(s.scanId)),
      ...postcards.map((p) => deletePostcardById(p.postcardId)),
      ...claims.map((c) => deleteClaimById(c.claimId)),
      ...leads.map((l) => deleteLeadById(l.leadId)),
    ]);

    await deleteBusinessById(businessId);

    // Stage 25 — destructive-action audit event, after the cascade succeeds.
    log({ event: 'customer.website.deleted', component: 'customer-editing', businessId, operation: 'delete_website', actorId: ownerUserId });
  } catch (err) {
    console.error('Failed to delete customer website:', err instanceof Error ? err.message : err);
    return { message: 'Failed to delete website. Please try again.' };
  }

  return undefined;
}
