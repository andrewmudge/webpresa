import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireCustomerSession, computeBusinessAccessMode } from '@/lib/auth/customer-authorization';
import { getBusinessesByOwnerUserId } from '@/lib/db/businesses';

export const dynamic = 'force-dynamic';

const PLAN_LABELS = { basic: 'Basic', growth: 'Growth' } as const;
const STATUS_LABELS = { active: 'Active', past_due: 'Payment issue', canceled: 'Inactive' } as const;

/**
 * Portfolio entry (implementation.md, Stage 19). Deliberately not an
 * analytics dashboard — its only job is getting the customer to the right
 * business. A single-business customer never sees this screen at all.
 */
export default async function AppHomePage() {
  const session = await requireCustomerSession();
  const businesses = await getBusinessesByOwnerUserId(session.sub);

  if (businesses.length === 0) {
    redirect('/account/claim-status');
  }
  if (businesses.length === 1) {
    redirect(`/app/businesses/${businesses[0].businessId}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Your businesses</h1>
      <p className="mt-1 text-sm text-gray-500">Choose a business to manage its website.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {businesses.map((business) => {
          const { mode } = computeBusinessAccessMode(business);
          return (
            <Link
              key={business.businessId}
              href={`/app/businesses/${business.businessId}`}
              className="block rounded-2xl bg-white border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-(--color-brand) transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-semibold text-gray-900">{business.name}</h2>
                {business.plan && (
                  <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-(--color-brand-muted) text-(--color-brand)">
                    {PLAN_LABELS[business.plan]}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {business.subscriptionStatus ? STATUS_LABELS[business.subscriptionStatus] : 'Not activated'}
              </p>
              {mode === 'billing_recovery' && (
                <p className="mt-2 text-xs font-medium text-amber-700">Payment needs attention</p>
              )}
              <span className="mt-3 inline-block text-sm font-medium text-(--color-brand)">Manage website →</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
