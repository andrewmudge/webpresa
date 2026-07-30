import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { PLAN_CATALOG } from '@/domain/constants/plan-catalog';
import { createBillingPortalSessionAction } from '@/app/account/checkout/actions';
import { Card, SaveButton } from '../FormBits';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  past_due: 'Payment problem',
  canceled: 'Canceled',
};

/**
 * Intentionally small (implementation.md, Stage 19): plan/status summary +
 * a single "Manage billing" button into Stripe's own Customer Portal. No
 * custom payment-method, invoice, or cancellation UI — Stripe already owns
 * that. Available in every access mode, including `billing_recovery` (this
 * *is* the recovery surface) — the one page in this dashboard that stays
 * reachable regardless of subscription state.
 */
export default async function BillingPage({ params }: Props) {
  const { businessId } = await params;
  const session = await requireCustomerSession();
  const business = await requireBusinessOwnership(session.sub, businessId);
  const { mode } = await requireBusinessAccess(session.sub, businessId);

  const plan = business.plan ? PLAN_CATALOG[business.plan] : undefined;
  const periodEnd = business.currentPeriodEnd
    ? new Date(business.currentPeriodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">Managing the subscription for {business.name}.</p>
      </div>

      {mode === 'billing_recovery' && (
        <div role="alert" className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          There&apos;s a problem with your last payment. Update your payment method to keep your website active.
        </div>
      )}

      <Card title="Current plan">
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-gray-500">Plan</dt>
            <dd className="text-gray-900 font-medium">{plan?.label ?? 'None'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Price</dt>
            <dd className="text-gray-900 font-medium">{plan?.priceDisplay ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd className="text-gray-900 font-medium">{business.subscriptionStatus ? STATUS_LABELS[business.subscriptionStatus] : 'Not activated'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{business.cancelAtPeriodEnd ? 'Ends on' : 'Renews on'}</dt>
            <dd className="text-gray-900 font-medium">{periodEnd ?? '—'}</dd>
          </div>
        </dl>

        {mode !== 'none' && (
          <form action={createBillingPortalSessionAction.bind(null, businessId)} className="mt-5">
            <SaveButton label="Manage billing" />
          </form>
        )}
        {mode === 'none' && (
          <a
            href="/account/claim-status"
            className="mt-5 inline-block rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
          >
            Choose a plan
          </a>
        )}
      </Card>
    </div>
  );
}
