import { requireCustomerSession } from '@/lib/auth/customer-authorization';
import { getBusinessesByOwnerUserId } from '@/lib/db/businesses';
import { customerSignOutAction } from '@/lib/auth/customer-actions';
import { createBillingPortalSessionAction } from '@/app/account/checkout/actions';
import { PlanSelectionForm } from './PlanSelectionForm';
import type { Business } from '@/domain/models/business';

export const dynamic = 'force-dynamic';

const PLAN_LABELS = { basic: 'Basic', growth: 'Growth' } as const;

function BusinessCard({ business }: { business: Business }) {
  const { subscriptionStatus, plan, cancelAtPeriodEnd, currentPeriodEnd } = business;
  const renewsOrEndsOn = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-(--color-border) p-6">
      <h1 className="text-lg font-semibold text-gray-900">You&apos;ve claimed {business.name}</h1>

      {subscriptionStatus === 'active' && (
        <>
          <p className="mt-2 text-sm text-gray-600">
            {plan ? PLAN_LABELS[plan] : 'Your'} plan is active.
            {cancelAtPeriodEnd && renewsOrEndsOn ? ` Your plan ends on ${renewsOrEndsOn}.` : renewsOrEndsOn ? ` Renews on ${renewsOrEndsOn}.` : ''}
          </p>
          <form action={createBillingPortalSessionAction.bind(null, business.businessId)} className="mt-4">
            <button
              type="submit"
              className="w-full rounded-lg border border-(--color-border) text-gray-700 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Manage billing
            </button>
          </form>
        </>
      )}

      {subscriptionStatus === 'past_due' && (
        <>
          <div role="alert" className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            There was a problem with your last payment. Update your payment method to keep your website active.
          </div>
          <form action={createBillingPortalSessionAction.bind(null, business.businessId)} className="mt-4">
            <button
              type="submit"
              className="w-full rounded-lg bg-(--color-brand) text-white py-2.5 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
            >
              Update payment method
            </button>
          </form>
        </>
      )}

      {subscriptionStatus !== 'active' && subscriptionStatus !== 'past_due' && (
        <>
          <p className="mt-2 text-sm text-gray-600">
            {subscriptionStatus === 'canceled'
              ? 'Your subscription has ended. Choose a plan to reactivate your website.'
              : 'Choose a plan to activate your dashboard and start managing your website.'}
          </p>
          <PlanSelectionForm businessId={business.businessId} />
        </>
      )}
    </div>
  );
}

/**
 * Business-scoped (a customer may own more than one business — see
 * implementation.md, Stage 17, "Ownership model"), resolved via
 * `owner-user-id-index` rather than assuming a single owned business.
 *
 * Stage 17 shipped this as an informational-only "activate (coming soon)"
 * placeholder; Stage 18 replaces it with a real plan selector, live
 * subscription status, and a Customer Portal link.
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
          <BusinessCard key={business.businessId} business={business} />
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
