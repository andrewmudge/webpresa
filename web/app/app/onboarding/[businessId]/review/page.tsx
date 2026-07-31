import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { ensureCustomerOnboarding } from '@/lib/onboarding/ensure';
import { canAccessOnboardingStep } from '@/lib/onboarding/steps';
import { Card, TextField, TextAreaField, SaveButton } from '@/app/app/businesses/[businessId]/FormBits';
import { OnboardingProgress } from '../OnboardingProgress';
import { completeReviewAction } from '../actions';

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <OnboardingProgress current="review" completed={onboarding.completedSteps} />
      <h1 className="text-2xl font-bold text-gray-900">Review your business information</h1>
      <p className="mt-2 text-sm text-gray-600">Please confirm this information is accurate — we&apos;ll use it on your website.</p>

      {error && (
        <div role="alert" className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={completeReviewAction.bind(null, businessId)} className="mt-6 space-y-6">
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

        <Card title="Services" description="At least one service is required — you can add more detail later.">
          {services.length > 0 ? (
            <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
              {services.map((s, i) => (
                <li key={i}>{s.name}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-amber-700">No services added yet.</p>
          )}
          <Link
            href={`/app/businesses/${businessId}/website#services`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs font-medium text-(--color-brand) underline"
          >
            Add or edit services →
          </Link>
        </Card>

        <SaveButton label="Continue" />
      </form>
    </div>
  );
}
