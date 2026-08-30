'use server';
import { redirect } from 'next/navigation';
import { requireCustomerSession, requireActiveSubscription, requireBusinessOwnership } from '@/lib/auth/customer-authorization';
import { getBusinessById } from '@/lib/db/businesses';
import { startDomainConnection } from '@/lib/domains/connect';
import { disconnectDomainConnectionForCustomer } from '@/lib/domains/disconnect';
import { getCustomerDomainProfile } from '@/lib/db/customer-domain-profiles';
import { getStorefrontSsoUrl } from '@/lib/opensrs/client';
import type { DomainRegistrarProvider } from '@/domain/models/domain-connection';
import { DOMAIN_REGISTRAR_PROVIDERS } from '@/domain/models/domain-connection';

/**
 * Post-onboarding domain management (Settings → Domain). Mirrors the
 * onboarding domain step's actions (`onboarding/[businessId]/actions.ts`)
 * against the same underlying `lib/` functions, but redirects back to
 * Settings rather than the onboarding wizard, and never touches
 * `CustomerOnboarding` step-completion state — irrelevant once onboarding
 * is already complete, which is the only way a customer reaches this page
 * (see `onboarding/[businessId]/domain/page.tsx`'s completed-onboarding
 * redirect and `settings/domain/page.tsx`'s own access guard).
 */
async function requireSettingsDomainAccess(businessId: string): Promise<string> {
  const session = await requireCustomerSession();
  await requireActiveSubscription(session.sub, businessId);
  return session.sub;
}

const SETTINGS_DOMAIN_PATH = (businessId: string) => `/app/businesses/${businessId}/settings/domain`;

/** "Use my Webpresa address for now" — no `DomainConnection` to create; absence of one already means the Webpresa address. Just returns to the domain page. */
export async function settingsDeferDomainAction(businessId: string): Promise<void> {
  await requireSettingsDomainAccess(businessId);
  redirect(SETTINGS_DOMAIN_PATH(businessId));
}

/** Connect a domain the customer already owns — same `startDomainConnection` the onboarding flow uses. */
export async function settingsConnectExistingDomainAction(businessId: string, formData: FormData): Promise<void> {
  const userId = await requireSettingsDomainAccess(businessId);

  const rawDomain = formData.get('domain');
  if (typeof rawDomain !== 'string' || !rawDomain.trim()) {
    redirect(`${SETTINGS_DOMAIN_PATH(businessId)}?error=${encodeURIComponent('Enter a domain such as coastalplumbing.com.')}`);
  }

  const business = await getBusinessById(businessId);
  if (!business) redirect(SETTINGS_DOMAIN_PATH(businessId));

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
    redirect(`${SETTINGS_DOMAIN_PATH(businessId)}?error=${encodeURIComponent(result.message)}`);
  }
  redirect(SETTINGS_DOMAIN_PATH(businessId));
}

export type ManageOpenSrsAccountResult = { outcome: 'redirect'; url: string } | { outcome: 'error'; message: string };

const GENERIC_STOREFRONT_ERROR = 'Unable to open the domain store right now. Please try again.';

/** Mints a fresh SSO link into the customer's existing Storefront account — see `lib/opensrs/client.ts`'s `getStorefrontSsoUrl`. Never creates an account; only reachable once a purchase already has, via the webhook flow. */
export async function settingsManageOpenSrsAccountAction(businessId: string): Promise<ManageOpenSrsAccountResult> {
  const session = await requireCustomerSession();
  await requireActiveSubscription(session.sub, businessId);

  const profile = await getCustomerDomainProfile(session.sub);
  if (!profile) {
    return { outcome: 'error', message: GENERIC_STOREFRONT_ERROR };
  }

  try {
    const { url } = await getStorefrontSsoUrl(profile.opensrsCustomerId);
    return { outcome: 'redirect', url };
  } catch (err) {
    console.error('[opensrs] manage_account_sso_failed', { businessId, err });
    return { outcome: 'error', message: GENERIC_STOREFRONT_ERROR };
  }
}

/** "Change domain" — hard-disconnects the current connection so a different domain can be chosen. Called directly from a client component (`useTransition`), not a `<form action>`, so the confirm UI can show an inline error rather than a redirect-based one — mirrors `deleteWebsiteActionCustomer`'s shape. */
export async function settingsDisconnectCurrentDomainAction(businessId: string): Promise<{ message?: string } | undefined> {
  const session = await requireCustomerSession();
  await requireActiveSubscription(session.sub, businessId);
  await requireBusinessOwnership(session.sub, businessId);

  const result = await disconnectDomainConnectionForCustomer(businessId);
  if (!result.disconnected) {
    return { message: result.message };
  }
  return undefined;
}
