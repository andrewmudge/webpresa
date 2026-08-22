import Link from 'next/link';
import type { MarketingKpis } from '@/lib/marketing/dashboard';

function KpiTile({ label, value, href }: { label: string; value: number; href?: string }) {
  const className = `rounded-xl border border-gray-200 bg-white p-5 ${href ? 'block hover:border-(--color-brand) hover:shadow-sm transition-all' : ''}`;
  const content = (
    <>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value.toLocaleString()}</p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}

/**
 * Deliberately no open-rate tile — modern email privacy features make
 * open-rate data unreliable; clicks/claims/paid conversions matter more
 * (see `implementation.md`, Marketing stage, "Marketing dashboard — top
 * summary").
 */
export function KpiGrid({ kpis, activeCampaigns }: { kpis: MarketingKpis; activeCampaigns: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <KpiTile label="Active Campaigns" value={activeCampaigns} />
      <KpiTile label="Postcards Delivered" value={kpis.postcardsDelivered} />
      <KpiTile label="Email 1 Sent" value={kpis.email1Sent} href="/admin/marketing/outbox?sequence=1" />
      <KpiTile label="Email 2 Sent" value={kpis.email2Sent} href="/admin/marketing/outbox?sequence=2" />
      <KpiTile label="Email 3 Sent" value={kpis.email3Sent} href="/admin/marketing/outbox?sequence=3" />
      <KpiTile label="Email Clicks" value={kpis.emailClicks} />
      <KpiTile label="Postcard Engagements" value={kpis.postcardEngagements} />
      <KpiTile label="Claims" value={kpis.claims} />
      <KpiTile label="Customers" value={kpis.customers} />
      <KpiTile label="Unsubscribes" value={kpis.unsubscribes} />
      <KpiTile label="Bounces" value={kpis.bounces} />
    </div>
  );
}
