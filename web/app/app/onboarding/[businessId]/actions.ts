'use server';
import { redirect } from 'next/navigation';
import { requireCustomerSession, requireActiveSubscription } from '@/lib/auth/customer-authorization';
import { getBusinessById } from '@/lib/db/businesses';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { updateCustomerBusinessInfo } from '@/lib/customer-editing/business-info';
import { updateCustomerSectionContent } from '@/lib/customer-editing/section-content';
import { publishCustomerDraft } from '@/lib/customer-editing/publish';
import {
  completeWelcomeStep,
  completeReviewStep,
  deferDomainStep,
  completeExistingDomainStep,
  completePublishStep,
  completeTourStep,
} from '@/lib/onboarding/complete-step';
import { startDomainConnection } from '@/lib/domains/connect';
import type { DomainRegistrarProvider } from '@/domain/models/domain-connection';
import { DOMAIN_REGISTRAR_PROVIDERS } from '@/domain/models/domain-connection';

/**
 * Every onboarding mutation independently re-derives session → ownership →
 * `mode === 'full'`, exactly like Stage 19's `requireEditAccess`
 * (`app/app/businesses/[businessId]/actions.ts`) — never trusted from
 * whatever the submitting page already rendered.
 */
async function requireOnboardingAccess(businessId: string): Promise<string> {
  const session = await requireCustomerSession();
  await requireActiveSubscription(session.sub, businessId);
  return session.sub;
}

export async function completeWelcomeAction(businessId: string): Promise<void> {
  await requireOnboardingAccess(businessId);
  await completeWelcomeStep(businessId);
  redirect(`/app/onboarding/${businessId}/review`);
}

export async function completeReviewAction(businessId: string, formData: FormData): Promise<void> {
  await requireOnboardingAccess(businessId);

  const saveResult = await updateCustomerBusinessInfo(businessId, formData);
  if (saveResult?.errors) {
    redirect(`/app/onboarding/${businessId}/review?error=${encodeURIComponent('Please fix the highlighted fields.')}`);
  }
  if (saveResult?.message) {
    redirect(`/app/onboarding/${businessId}/review?error=${encodeURIComponent(saveResult.message)}`);
  }

  const business = await getBusinessById(businessId);
  if (!business?.phone && !business?.email) {
    redirect(
      `/app/onboarding/${businessId}/review?error=${encodeURIComponent('Add a phone number or email so customers can reach you.')}`,
    );
  }

  const previews = await listPreviewsForBusiness(businessId);
  const services = previews[0]?.content.services ?? [];
  if (services.length === 0) {
    redirect(`/app/onboarding/${businessId}/review?error=${encodeURIComponent('Add at least one service before continuing.')}`);
  }

  await completeReviewStep(businessId);
  redirect(`/app/onboarding/${businessId}/domain`);
}

/**
 * Inline services save on the Review step — reuses the exact same
 * auth-agnostic write path the real Website editor's Services tab uses
 * (`updateCustomerSectionContent(businessId, 'services', formData)`),
 * so a customer can add/edit services without leaving onboarding at all.
 * Deliberately does not advance the onboarding step — saving is separate
 * from the page's own "Continue" action.
 */
export async function updateReviewServicesAction(businessId: string, formData: FormData): Promise<void> {
  await requireOnboardingAccess(businessId);
  const result = await updateCustomerSectionContent(businessId, 'services', formData);
  redirect(
    result?.message
      ? `/app/onboarding/${businessId}/review?error=${encodeURIComponent(result.message)}`
      : `/app/onboarding/${businessId}/review`,
  );
}

/**
 * Part 1: the Domain step's defer choice — the Webpresa address is an
 * application route, never a fabricated `DomainConnection`. Also reachable
 * after onboarding is already complete (the dashboard's persistent domain
 * setup item), in which case it re-affirms the step without re-entering the
 * wizard — `updated.status` is already `'completed'` in that case.
 */
export async function deferDomainAction(businessId: string): Promise<void> {
  await requireOnboardingAccess(businessId);
  const updated = await deferDomainStep(businessId);
  redirect(updated.status === 'completed' ? `/app/businesses/${businessId}` : `/app/onboarding/${businessId}/publish`);
}

/** Part 2: connect a domain the customer already owns — DNS connection only, never a registrar transfer. */
export async function connectExistingDomainAction(businessId: string, formData: FormData): Promise<void> {
  const userId = await requireOnboardingAccess(businessId);

  const rawDomain = formData.get('domain');
  if (typeof rawDomain !== 'string' || !rawDomain.trim()) {
    redirect(`/app/onboarding/${businessId}/domain?error=${encodeURIComponent('Enter a domain such as coastalplumbing.com.')}`);
  }

  const business = await getBusinessById(businessId);
  if (!business) redirect(`/app/onboarding/${businessId}/domain`);

  const registrarRaw = formData.get('registrarProvider');
  const registrarProvider =
    typeof registrarRaw === 'string' && (DOMAIN_REGISTRAR_PROVIDERS as readonly string[]).includes(registrarRaw)
      ? (registrarRaw as DomainRegistrarProvider)
      : undefined;

  const result = await startDomainConnection({
    businessId,
    ownerUserId: userId,
    slug: business.slug,
    rawDomain,
    registrarProvider,
  });

  if (result.outcome !== 'connected') {
    redirect(`/app/onboarding/${businessId}/domain?error=${encodeURIComponent(result.message)}`);
  }
  redirect(`/app/onboarding/${businessId}/domain`);
}

/**
 * Completes the domain step for an existing (connecting or already-
 * connected) domain — the connection itself may still be `awaiting_dns`/
 * `verifying`. Also reachable post-completion (see `deferDomainAction`).
 */
export async function completeExistingDomainAction(
  businessId: string,
  domainConnectionId: string,
  _formData: FormData,
): Promise<void> {
  await requireOnboardingAccess(businessId);
  const updated = await completeExistingDomainStep(businessId, domainConnectionId);
  redirect(updated.status === 'completed' ? `/app/businesses/${businessId}` : `/app/onboarding/${businessId}/publish`);
}

export async function publishOnboardingAction(businessId: string, formData: FormData): Promise<void> {
  await requireOnboardingAccess(businessId);

  const previewId = formData.get('previewId');
  if (typeof previewId === 'string' && previewId) {
    const result = await publishCustomerDraft(businessId, previewId);
    if (result?.message) {
      redirect(`/app/onboarding/${businessId}/publish?error=${encodeURIComponent(result.message)}`);
    }
  }

  const previews = await listPreviewsForBusiness(businessId);
  const hasPublished = previews.some((p) => p.status === 'published');
  if (!hasPublished) {
    redirect(`/app/onboarding/${businessId}/publish?error=${encodeURIComponent('Nothing to publish yet.')}`);
  }

  await completePublishStep(businessId);
  redirect(`/app/onboarding/${businessId}/tour`);
}

/**
 * Exit onboarding temporarily with only a draft. The `publish` step (and
 * therefore the whole record) stays incomplete — the dashboard shows a
 * "still needs to be published" notice and the customer resumes here later.
 */
export async function continueWithDraftAction(businessId: string): Promise<void> {
  await requireOnboardingAccess(businessId);
  redirect(`/app/businesses/${businessId}`);
}

export async function completeTourAction(
  businessId: string,
  outcome: 'completed' | 'skipped',
  _formData: FormData,
): Promise<void> {
  await requireOnboardingAccess(businessId);
  await completeTourStep(businessId, outcome);
  redirect(`/app/businesses/${businessId}`);
}
