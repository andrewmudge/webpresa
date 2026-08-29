'use server';
import { redirect } from 'next/navigation';
import { requireCustomerSession, requireActiveSubscription } from '@/lib/auth/customer-authorization';
import { getBusinessById } from '@/lib/db/businesses';
import type { Business } from '@/domain/models/business';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { updateCustomerBusinessInfo } from '@/lib/customer-editing/business-info';
import { updateCustomerSectionContent } from '@/lib/customer-editing/section-content';
import { publishCustomerDraft } from '@/lib/customer-editing/publish';
import { updateCustomerLeadNotificationEmail } from '@/lib/customer-editing/lead-notification-email';
import {
  completeReviewStep,
  completeLeadsStep,
  deferDomainStep,
  completeExistingDomainStep,
  completePublishStep,
  completeTourStep,
} from '@/lib/onboarding/complete-step';
import { startDomainConnection } from '@/lib/domains/connect';
import type { DomainRegistrarProvider } from '@/domain/models/domain-connection';
import { DOMAIN_REGISTRAR_PROVIDERS } from '@/domain/models/domain-connection';
import { adminGetCustomerProfileBySub } from '@/lib/auth/customer-cognito';
import { getCustomerDomainProfile, createCustomerDomainProfile } from '@/lib/db/customer-domain-profiles';
import { putDomainPurchaseIntent } from '@/lib/db/domain-purchase-intents';
import { createDomainPurchaseIntent } from '@/domain/factories/domain-purchase-intent.factory';
import { createStorefrontCustomer, getStorefrontSsoUrl, deriveStorefrontUsername } from '@/lib/opensrs/client';
import { OPENSRS_DNS_TEMPLATE_ID } from '@/lib/opensrs/constants';

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

  // The `leads` step asks where to send new-lead notifications — always
  // shown, even when `Business.email` is already set, since a business's
  // public contact email and the address they actually want lead
  // notifications sent to aren't guaranteed to be the same.
  redirect(`/app/onboarding/${businessId}/leads`);
}

/**
 * Completes the `leads` step — only reachable when Review left
 * `Business.email` unset (see `completeReviewAction`), so an explicit
 * notification email is required here; there's no "skip" option.
 */
export async function completeLeadsAction(businessId: string, formData: FormData): Promise<void> {
  await requireOnboardingAccess(businessId);

  const email = formData.get('leadNotificationEmail');
  if (typeof email !== 'string' || !email.trim()) {
    redirect(`/app/onboarding/${businessId}/leads?error=${encodeURIComponent('Enter an email address for new-lead notifications.')}`);
  }

  const result = await updateCustomerLeadNotificationEmail(businessId, email.trim());
  if (result?.message) {
    redirect(`/app/onboarding/${businessId}/leads?error=${encodeURIComponent(result.message)}`);
  }

  await completeLeadsStep(businessId);
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
      : `/app/onboarding/${businessId}/review?servicesSaved=1`,
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

export type ResolveOpenSrsCustomerResult =
  | { outcome: 'resolved'; opensrsCustomerId: string }
  /** OpenSRS requires an address/phone on the customer record and this app never collects one
   *  personally — the business's own address/phone is used instead (see below), so a business
   *  missing either blocks account creation until the customer fills them in. */
  | { outcome: 'missing_business_contact_info' };

/**
 * Resolves (creating if necessary) the ONE OpenSRS Storefront customer
 * account for this Cognito identity — never a second account, and never a
 * per-Business Storefront customer. Mirrors
 * `resolveStripeCustomerIdForCustomer` (`app/account/checkout/actions.ts`)
 * exactly, including its lost-race handling (see
 * `lib/db/customer-domain-profiles.ts`).
 *
 * OpenSRS's real `POST /v1/customer` requires an address and phone number
 * (confirmed against OpenSRS's docs, 2026-08-28) that this app has no
 * personal-contact-info source for — the closest available data is the
 * *business's own* address/phone, used here as a reasonable stand-in (only
 * matters for whichever Business first triggers account creation; the
 * customer can correct it themselves inside Storefront afterward). `phone`
 * is passed through as-is, not verified E.164 as OpenSRS requires — a real
 * gap, since this app doesn't normalize phone numbers anywhere today.
 */
async function resolveOpenSrsCustomerId(userId: string, email: string, business: Business): Promise<ResolveOpenSrsCustomerResult> {
  const existing = await getCustomerDomainProfile(userId);
  if (existing) return { outcome: 'resolved', opensrsCustomerId: existing.opensrsCustomerId };

  if (!business.address || !business.phone) {
    return { outcome: 'missing_business_contact_info' };
  }

  // Cognito rarely has a real name on file unless the customer has visited
  // Settings → Account (see architecture.md, "Account card"). Falling back
  // to generic placeholders here is a deliberate, honest choice — Storefront
  // requires *some* first/last name to create the account, and the
  // customer can correct it themselves inside Storefront afterward.
  const profile = await adminGetCustomerProfileBySub(userId);
  const firstName = profile?.firstName?.trim() || 'Webpresa';
  const lastName = profile?.lastName?.trim() || 'Customer';

  const opensrsCustomerId = await createStorefrontCustomer({
    email,
    firstName,
    lastName,
    addressLine1: business.address.line1,
    city: business.address.city,
    state: business.address.state,
    postalCode: business.address.postalCode,
    country: business.address.country,
    phone: business.phone,
    externalUserId: userId,
  });
  const result = await createCustomerDomainProfile(userId, opensrsCustomerId);
  return { outcome: 'resolved', opensrsCustomerId: result.profile.opensrsCustomerId };
}

export type StartDomainPurchaseResult = { outcome: 'redirect'; url: string } | { outcome: 'error'; message: string };

const GENERIC_PURCHASE_ERROR = 'Unable to open the domain store right now. Please try again.';

/**
 * Part 3 (OpenSRS Storefront): sends the customer into Storefront's hosted
 * domain search/checkout, already signed in via a one-time SSO URL — never
 * a second signup/login screen (see `lib/opensrs/client.ts`). A
 * `DomainPurchaseIntent` correlates whichever purchase Storefront's webhook
 * later reports back to this specific Business (see
 * `app/api/webhooks/opensrs/route.ts`), since a customer may own several
 * Businesses and Storefront's own session state doesn't carry that.
 *
 * The DNS Template (`dnstemplateid`) is what makes the purchased domain
 * automatically point at this app — no manual DNS step, unlike the
 * existing-domain flow above. Confirmed working (2026-08-29) against a real
 * PTE purchase — Storefront's SSO URL does accept the appended query param.
 *
 * Returns a result instead of redirecting (unlike every other onboarding
 * action) — the caller (`DomainChoiceCards`) opens Storefront in a *new*
 * tab rather than navigating the current one away from Webpresa entirely,
 * so this can't just `redirect()` the current request. This also means
 * no `redirect()`-inside-`try/catch` hazard to route around, unlike the
 * version of this function that shipped initially — every path is a plain
 * `return`.
 */
export async function startDomainPurchaseAction(businessId: string): Promise<StartDomainPurchaseResult> {
  const session = await requireCustomerSession();
  await requireActiveSubscription(session.sub, businessId);

  if (!OPENSRS_DNS_TEMPLATE_ID) {
    console.error('[opensrs] dns_template_id_unset', { businessId });
    return { outcome: 'error', message: 'Domain purchase is not available yet. Please try again later.' };
  }

  const business = await getBusinessById(businessId);
  if (!business) return { outcome: 'error', message: GENERIC_PURCHASE_ERROR };

  let customerResult: ResolveOpenSrsCustomerResult;
  try {
    customerResult = await resolveOpenSrsCustomerId(session.sub, session.email, business);
  } catch (err) {
    console.error('[opensrs] start_purchase_failed', { businessId, err });
    return { outcome: 'error', message: GENERIC_PURCHASE_ERROR };
  }

  if (customerResult.outcome === 'missing_business_contact_info') {
    return { outcome: 'error', message: 'Add a business address and phone number in Settings before buying a domain.' };
  }

  try {
    const intent = createDomainPurchaseIntent({
      businessId,
      userId: session.sub,
      storefrontUsername: deriveStorefrontUsername(session.sub),
    });
    await putDomainPurchaseIntent(intent);

    // No `extuserid` param here (unlike an earlier version) — confirmed
    // 2026-08-29 against a real webhook delivery that it isn't carried back
    // at all, so it can't correlate anything; `external_user_id` is already
    // set once at customer-creation time (`createStorefrontCustomer`),
    // which is `extuserid`'s actual documented purpose anyway. Correlation
    // now happens via `storefrontUsername` — see the intent model's doc
    // comment.
    const { url } = await getStorefrontSsoUrl(customerResult.opensrsCustomerId);
    const separator = url.includes('?') ? '&' : '?';
    const finalUrl = `${url}${separator}dnstemplateid=${encodeURIComponent(OPENSRS_DNS_TEMPLATE_ID)}`;
    return { outcome: 'redirect', url: finalUrl };
  } catch (err) {
    console.error('[opensrs] start_purchase_failed', { businessId, err });
    return { outcome: 'error', message: GENERIC_PURCHASE_ERROR };
  }
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
  // 'completed' launches the real dashboard walkthrough (DashboardTour.tsx)
  // via this query param; 'skipped' lands on a plain dashboard — the
  // sidebar's "Take a tour" link is the only way to see it after that.
  redirect(outcome === 'completed' ? `/app/businesses/${businessId}?tour=start` : `/app/businesses/${businessId}`);
}
