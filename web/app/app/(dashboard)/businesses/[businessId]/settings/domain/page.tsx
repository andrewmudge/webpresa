import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { listDomainConnectionsForBusiness } from '@/lib/db/domain-connections';
import { resolveAppBaseUrl } from '@/lib/env/app-base-url';
import { SettingsDomainPanel } from './SettingsDomainPanel';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ error?: string }>;
}

/**
 * Domain management, post-onboarding (Settings → Domain card → "Manage
 * Domain"). Reuses the exact same choice-cards/waiting/status views the
 * onboarding wizard's Domain step uses (`SettingsDomainPanel`), just with
 * dashboard chrome instead of `OnboardingShell` and settings-scoped
 * actions — the onboarding wizard itself never re-shows this step once
 * completed (see `onboarding/[businessId]/domain/page.tsx`). Requires
 * `mode === 'full'`, matching that same onboarding guard — none of the
 * reused components (choice cards, status panel) have a read-only variant.
 */
export default async function SettingsDomainPage({ params, searchParams }: Props) {
  const { businessId } = await params;
  const { error } = await searchParams;
  const session = await requireCustomerSession();
  const business = await requireBusinessOwnership(session.sub, businessId);
  const { mode } = await requireBusinessAccess(session.sub, businessId);
  if (mode !== 'full') redirect(`/app/businesses/${businessId}`);

  const connections = await listDomainConnectionsForBusiness(businessId);
  const connection = connections.find((c) => c.status !== 'disconnected') ?? null;

  const displayUrl =
    connection?.status === 'active'
      ? connection.normalizedDomain
      : `${resolveAppBaseUrl().replace(/^https?:\/\//, '')}/b/${business.slug}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <Link
          href={`/app/businesses/${businessId}/settings`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to Settings
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">Domain</h1>
        <p className="mt-1 text-sm text-gray-600">Manage where {business.name}&apos;s website lives on the internet.</p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <SettingsDomainPanel businessId={businessId} displayUrl={displayUrl} connection={connection} />
    </div>
  );
}
