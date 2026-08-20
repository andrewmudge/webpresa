import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { adminGetCustomerProfileBySub } from '@/lib/auth/customer-cognito';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { listDomainConnectionsForBusiness } from '@/lib/db/domain-connections';
import { getBusinessesByOwnerUserId } from '@/lib/db/businesses';
import { deriveWebsiteStatus } from '@/lib/customer-editing/site-status';
import { redirect } from 'next/navigation';
import { SaveBanner } from '../SaveBanner';
import { AccountCard } from './AccountCard';
import { BusinessInfoCard } from './BusinessInfoCard';
import { WebsiteCard } from './WebsiteCard';
import { DomainCard } from './DomainCard';
import { NotificationsCard } from './NotificationsCard';
import { DangerZoneCard } from './DangerZoneCard';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}

export default async function SettingsPage({ params, searchParams }: Props) {
  const { businessId } = await params;
  const { error, saved } = await searchParams;
  const session = await requireCustomerSession();
  const business = await requireBusinessOwnership(session.sub, businessId);
  const { mode } = await requireBusinessAccess(session.sub, businessId);

  if (mode === 'none') redirect(`/app/businesses/${businessId}`);
  const isReadOnly = mode === 'billing_recovery';

  const [profile, previews, domainConnections, ownedBusinesses] = await Promise.all([
    adminGetCustomerProfileBySub(session.sub),
    listPreviewsForBusiness(businessId),
    listDomainConnectionsForBusiness(businessId),
    getBusinessesByOwnerUserId(session.sub),
  ]);

  const websiteStatus = deriveWebsiteStatus(previews);
  const domainConnection = domainConnections.find((c) => c.status !== 'disconnected') ?? null;
  const liveUrl = domainConnection?.status === 'active' ? `https://${domainConnection.primaryHostname}` : `/b/${business.slug}`;
  const hours = previews[0]?.content?.hours;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account, business, and website preferences.</p>
      </div>

      <SaveBanner isReadOnly={isReadOnly} error={error} saved={saved} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AccountCard
          businessId={businessId}
          firstName={profile?.firstName}
          lastName={profile?.lastName}
          email={session.email}
          phone={profile?.phone}
          isReadOnly={isReadOnly}
        />
        <BusinessInfoCard businessId={businessId} business={business} hours={hours} isReadOnly={isReadOnly} />
        <WebsiteCard businessId={businessId} slug={business.slug} status={websiteStatus} liveUrl={liveUrl} />
        <DomainCard businessId={businessId} slug={business.slug} domainConnection={domainConnection} />
        <NotificationsCard
          businessId={businessId}
          defaultEnabled={business.draftChangesNoticeEnabled !== false}
          defaultLeadNotificationEmail={business.leadNotificationEmail}
          isReadOnly={isReadOnly}
        />
        <DangerZoneCard
          businessId={businessId}
          businessName={business.name}
          hasActiveSubscription={business.subscriptionStatus === 'active'}
          email={session.email}
          businessCount={ownedBusinesses.length}
          isReadOnly={isReadOnly}
        />
      </div>
    </div>
  );
}
