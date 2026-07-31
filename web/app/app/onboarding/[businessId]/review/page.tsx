import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { ensureCustomerOnboarding } from '@/lib/onboarding/ensure';
import { canAccessOnboardingStep } from '@/lib/onboarding/steps';
import { Card, TextField, TextAreaField, SaveButton } from '@/app/app/businesses/[businessId]/FormBits';
import { OnboardingProgress } from '../OnboardingProgress';
import { completeReviewAction, updateReviewServicesAction } from '../actions';

const SERVICE_EXTRA_ROWS = 3;

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function OnboardingReviewPage({ params, searchParams }: Props) {
  const { businessId } = await params;
  const { error } = await searchParams;
  const session = await requireCustomerSession();
  const business = await requireBusinessOwnership(session.sub, businessId);
  const { mode } = await requireBusinessAccess(session.sub, businessId);
  if (mode !== 'full') redirect(`/app/businesses/${businessId}`);

  const onboarding = await ensureCustomerOnboarding(businessId, session.sub);
  if (onboarding.status === 'completed') redirect(`/app/onboarding/${businessId}`);
  if (!canAccessOnboardingStep(onboarding.completedSteps, 'review')) {
    redirect(`/app/onboarding/${businessId}`);
  }

  const previews = await listPreviewsForBusiness(businessId);
  const services = previews[0]?.content.services ?? [];
  const serviceRows = [...services, ...Array(SERVICE_EXTRA_ROWS).fill({ name: '', description: '' })].slice(0, 10);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <OnboardingProgress businessId={businessId} current="review" completed={onboarding.completedSteps} />
      <h1 className="text-2xl font-bold text-gray-900">Review your business information</h1>
      <p className="mt-2 text-sm text-gray-600">Please confirm this information is accurate — we&apos;ll use it on your website.</p>

      {error && (
        <div role="alert" className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form id="review-form" action={completeReviewAction.bind(null, businessId)} className="mt-6 space-y-6">
        <Card title="Business information">
          <div className="space-y-4">
            <TextField label="Business name" name="name" defaultValue={business.name} required maxLength={200} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Phone" name="phone" defaultValue={business.phone} />
              <TextField label="Email" name="email" type="email" defaultValue={business.email} />
            </div>
            <p className="text-xs text-gray-500">Add at least a phone number or an email so customers can reach you.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Address line 1 (optional)" name="addressLine1" defaultValue={business.address?.line1} />
              <TextField label="City" name="addressCity" defaultValue={business.address?.city} />
              <TextField label="State" name="addressState" defaultValue={business.address?.state} />
              <TextField label="ZIP / Postal code" name="addressPostalCode" defaultValue={business.address?.postalCode} />
            </div>
            <TextAreaField
              label="Social links (one per line, optional)"
              name="socialLinks"
              defaultValue={business.socialLinks?.join('\n')}
              placeholder="https://facebook.com/yourbusiness"
              rows={2}
            />
          </div>
        </Card>
      </form>

      <div className="mt-6">
        <Card title="Services" description="At least one service is required — add or edit them right here.">
          <form action={updateReviewServicesAction.bind(null, businessId)} className="space-y-3">
            {serviceRows.map((row, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-2 border border-gray-100 rounded-lg p-3">
                <TextField label={`Service ${i + 1} name`} name={`services.${i}.name`} defaultValue={row.name} maxLength={100} />
                <TextField label="Description" name={`services.${i}.description`} defaultValue={row.description} maxLength={500} />
              </div>
            ))}
            <SaveButton label="Save services" />
          </form>
        </Card>
      </div>

      <button
        type="submit"
        form="review-form"
        className="mt-6 w-full sm:w-auto rounded-lg bg-(--color-brand) text-white px-5 py-2.5 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
      >
        Continue
      </button>
    </div>
  );
}
