import { requireCustomerSession } from '@/lib/auth/customer-authorization';
import { getBusinessesByOwnerUserId } from '@/lib/db/businesses';
import { customerSignOutAction } from '@/lib/auth/customer-actions';

export const dynamic = 'force-dynamic';

/**
 * Stage 17's only protected screen — "you own it, now pay." Business-scoped
 * (a customer may own more than one business — see implementation.md, Stage
 * 17, "Ownership model"), resolved via `owner-user-id-index` rather than
 * assuming a single owned business.
 *
 * Ships as an informational-only screen: there is nothing for the
 * "activate" call-to-action to call yet (Stage 18 owns Checkout), so it's a
 * disabled placeholder rather than a stub endpoint — see implementation.md,
 * Stage 17, "Risks and unresolved implementation details".
 */
export default async function ClaimStatusPage() {
  const session = await requireCustomerSession();
  const businesses = await getBusinessesByOwnerUserId(session.sub);

  if (businesses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-700">Your account isn&apos;t currently associated with a claimed business.</p>
          <form action={customerSignOutAction}>
            <button type="submit" className="text-sm underline text-gray-500 hover:text-gray-700">
              Sign out
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="w-full max-w-md space-y-4">
        {businesses.map((business) => (
          <div key={business.businessId} className="bg-white rounded-2xl shadow-sm border border-(--color-border) p-6">
            <h1 className="text-lg font-semibold text-gray-900">You&apos;ve claimed {business.name}</h1>
            <p className="mt-2 text-sm text-gray-600">
              Continue to activate your dashboard to start managing your website.
            </p>
            <button
              type="button"
              disabled
              title="Checkout will be available soon"
              className="mt-4 w-full rounded-lg bg-(--color-brand) text-white py-2.5 text-sm font-medium opacity-60 cursor-not-allowed"
            >
              Activate (coming soon)
            </button>
          </div>
        ))}
        <form action={customerSignOutAction} className="text-center">
          <button type="submit" className="text-sm underline text-gray-500 hover:text-gray-700">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
