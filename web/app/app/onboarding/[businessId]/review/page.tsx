import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { ensureCustomerOnboarding } from '@/lib/onboarding/ensure';
import { canAccessOnboardingStep } from '@/lib/onboarding/steps';
import { resolveAppBaseUrl } from '@/lib/env/app-base-url';
import { TextField, TextAreaField, SaveButton } from '@/app/app/(dashboard)/businesses/[businessId]/FormBits';
import { OnboardingShell } from '../OnboardingShell';
import { OnboardingProgress } from '../OnboardingProgress';
import { OnboardingStepLayout } from '../OnboardingStepLayout';
import { OnboardingActionBar } from '../OnboardingActionBar';
import { OnboardingPrimaryButton } from '../OnboardingPrimaryButton';
import { SectionCard } from '../SectionCard';
import { WebsitePreviewPanel } from '../WebsitePreviewPanel';
import { completeReviewAction, updateReviewServicesAction } from '../actions';

const SERVICE_EXTRA_ROWS = 3;
const REVIEW_FORM_ID = 'review-form';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ error?: string; servicesSaved?: string }>;
}

export default async function OnboardingReviewPage({ params, searchParams }: Props) {
  const { businessId } = await params;
  const { error, servicesSaved } = await searchParams;
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
  const latest = previews[0];
  const hasDraft = !!latest && latest.status !== 'published';
  const services = latest?.content.services ?? [];
  const serviceRows = [...services, ...Array(SERVICE_EXTRA_ROWS).fill({ name: '', description: '' })].slice(0, 10);
  const displayUrl = `${resolveAppBaseUrl().replace(/^https?:\/\//, '')}/b/${business.slug}`;

  return (
    <OnboardingShell businessName={business.name}>
      <OnboardingProgress businessId={businessId} current="review" completed={onboarding.completedSteps} />

      <div className="mt-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Review your information</h1>
        <p className="mt-2 max-w-xl text-sm text-gray-600">
          Please confirm the details customers will see on your website below. You can update these later from your
          dashboard.
        </p>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <OnboardingStepLayout
        left={
          <div className="space-y-5">
            <form id={REVIEW_FORM_ID} action={completeReviewAction.bind(null, businessId)}>
              <div className="space-y-5">
                <SectionCard title="Business details">
                  <TextField
                    label="Business name"
                    name="name"
                    defaultValue={business.name}
                    required
                    maxLength={200}
                    autoComplete="organization"
                  />
                </SectionCard>

                <SectionCard title="Contact information" description="Add at least a phone number or an email so customers can reach you.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label="Phone (optional)" name="phone" type="tel" defaultValue={business.phone} autoComplete="tel" />
                    <TextField
                      label="Email (optional)"
                      name="email"
                      type="email"
                      defaultValue={business.email}
                      autoComplete="email"
                    />
                  </div>
                </SectionCard>

                <SectionCard title="Address" description="Optional — shown on your website if provided.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <TextField
                        label="Address line 1"
                        name="addressLine1"
                        defaultValue={business.address?.line1}
                        autoComplete="address-line1"
                      />
                    </div>
                    <TextField label="City" name="addressCity" defaultValue={business.address?.city} autoComplete="address-level2" />
                    <TextField label="State" name="addressState" defaultValue={business.address?.state} autoComplete="address-level1" />
                    <TextField
                      label="ZIP / Postal code"
                      name="addressPostalCode"
                      defaultValue={business.address?.postalCode}
                      autoComplete="postal-code"
                    />
                  </div>
                </SectionCard>

                <SectionCard title="Social links" description="One per line, optional.">
                  <TextAreaField
                    label="Links"
                    name="socialLinks"
                    defaultValue={business.socialLinks?.join('\n')}
                    placeholder="https://facebook.com/yourbusiness"
                    rows={2}
                  />
                </SectionCard>
              </div>
            </form>

            <SectionCard title="Services" description="At least one service is required — add or edit them right here.">
              <form action={updateReviewServicesAction.bind(null, businessId)} className="space-y-3">
                {serviceRows.map((row, i) => (
                  <div key={i} className="grid gap-2 rounded-lg border border-gray-100 p-3 sm:grid-cols-2">
                    <TextField label={`Service ${i + 1} name`} name={`services.${i}.name`} defaultValue={row.name} maxLength={100} />
                    <TextField label="Description" name={`services.${i}.description`} defaultValue={row.description} maxLength={500} />
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <SaveButton label="Save services" />
                  {servicesSaved === '1' && <span className="text-xs font-medium text-green-700">Saved</span>}
                </div>
              </form>
            </SectionCard>

            <p className="text-xs text-gray-400">Don&apos;t worry — you can change any of this anytime from your dashboard.</p>
          </div>
        }
        right={
          <div className="lg:sticky lg:top-6">
            <WebsitePreviewPanel
              key={`${business.updatedAt}:${latest?.updatedAt ?? ''}`}
              slug={business.slug}
              displayUrl={displayUrl}
              hasDraft={hasDraft}
              lastUpdated={latest?.updatedAt}
            />
          </div>
        }
      />

      <OnboardingActionBar
        primary={
          <OnboardingPrimaryButton
            action={completeReviewAction.bind(null, businessId)}
            externalFormId={REVIEW_FORM_ID}
            label="Continue to domain"
            pendingLabel="Saving…"
          />
        }
      />
    </OnboardingShell>
  );
}
