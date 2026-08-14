import { requireCustomerSession, requireBusinessOwnership, computeBusinessAccessMode, hasPlanCapability } from '@/lib/auth/customer-authorization';
import { listLeadsForBusiness } from '@/lib/db/leads';
import { Card } from '../FormBits';
import { LeadsList } from './LeadsList';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
}

/**
 * Stage 20 — the customer lead inbox. Unlike most of this dashboard's
 * editing surfaces (gated by `requireActiveSubscription`, which redirects
 * to `/account/claim-status`), an owner without an active subscription who
 * navigates here sees an upsell card rather than being bounced elsewhere —
 * the failure mode is "upgrade", not "access denied".
 */
export default async function LeadsPage({ params }: Props) {
  const { businessId } = await params;
  const session = await requireCustomerSession();
  const business = await requireBusinessOwnership(session.sub, businessId);
  const access = computeBusinessAccessMode(business);

  if (!hasPlanCapability(access, 'lead_capture')) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="mt-1 text-sm text-gray-500">Service requests submitted through your website.</p>
        </div>
        <Card title="Activate your subscription to unlock lead capture">
          <p className="text-sm text-gray-600">
            An active subscription adds a &quot;Request Service&quot; form to your website and delivers every submission here, with an
            email notification the moment it arrives.
          </p>
          <a
            href={`/app/businesses/${businessId}/billing`}
            className="mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-(--color-brand) text-white hover:bg-(--color-brand-dark) transition-colors"
          >
            View billing
          </a>
        </Card>
      </div>
    );
  }

  const leads = await listLeadsForBusiness(businessId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <p className="mt-1 text-sm text-gray-500">Service requests submitted through your website.</p>
      </div>
      <LeadsList businessId={businessId} leads={leads} isReadOnly={access.mode === 'billing_recovery'} />
    </div>
  );
}
