import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { ensureCustomerOnboarding } from '@/lib/onboarding/ensure';
import { resolveEarliestIncompleteStep } from '@/lib/onboarding/steps';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
}

/**
 * Onboarding entry point / resume router (implementation.md, Stage 19.x,
 * Part 1) — this bare URL renders nothing itself. Every first-visit
 * force-redirect and every "Continue onboarding" resume link in the app
 * points here; it just re-derives the real next step and forwards to it,
 * so none of those call sites need to know the step order themselves.
 *
 * The Welcome step this page used to render was removed (2026-07-31) —
 * `/account/checkout/success` now performs that celebrate/orient job, so
 * Review is the first real step a fresh onboarding record resolves to.
 */
export default async function OnboardingEntryPage({ params }: Props) {
  const { businessId } = await params;
  const session = await requireCustomerSession();
  await requireBusinessOwnership(session.sub, businessId);
  const { mode } = await requireBusinessAccess(session.sub, businessId);

  if (mode === 'none') redirect(`/app/businesses/${businessId}`);

  const onboarding = await ensureCustomerOnboarding(businessId, session.sub);

  // A billing_recovery customer may only resume viewing an already-completed
  // record — never start or continue an in-progress one.
  if (mode === 'billing_recovery' && onboarding.status !== 'completed') {
    redirect(`/app/businesses/${businessId}`);
  }

  if (onboarding.status === 'completed') {
    redirect(`/app/businesses/${businessId}`);
  }

  const earliest = resolveEarliestIncompleteStep(onboarding.completedSteps);
  redirect(`/app/onboarding/${businessId}/${earliest}`);
}
