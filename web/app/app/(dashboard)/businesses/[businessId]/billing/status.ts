import type { BadgeTone } from '../FormBits';
import type { SubscriptionStatus } from '@/domain/constants/plans';
import type { WebsiteState } from '@/lib/customer-editing/site-status';
import type { DomainConnectionStatus } from '@/domain/models/domain-connection';

export interface StatusDisplay {
  label: string;
  tone: BadgeTone;
}

const SUBSCRIPTION_BADGES: Record<SubscriptionStatus, StatusDisplay> = {
  active: { label: 'Active', tone: 'green' },
  past_due: { label: 'Payment problem', tone: 'amber' },
  canceled: { label: 'Canceled', tone: 'gray' },
};

/** Subscription status badge for the plan card. Cancellation-in-progress is communicated separately via a banner (see `businesses/[businessId]/page.tsx`'s "scheduled to cancel" treatment), not by changing this badge's color/label. */
export function resolveSubscriptionBadge(subscriptionStatus: SubscriptionStatus | undefined): StatusDisplay {
  if (!subscriptionStatus) return { label: 'Not activated', tone: 'gray' };
  return SUBSCRIPTION_BADGES[subscriptionStatus];
}

const DOMAIN_IN_PROGRESS_STATUSES: DomainConnectionStatus[] = [
  'draft',
  'awaiting_dns',
  'verifying',
  'connected',
  'certificate_pending',
];

/**
 * Single "website is..." status for the Website Status card, combining
 * publish state with domain-connection state. A `failed`/`disconnected`
 * domain (or no domain at all) never blocks a "Live" badge — only a domain
 * connection actively in progress does, since that's the one case where the
 * customer should expect the site's public address to still be changing.
 */
export function resolveWebsiteOverallStatus(
  websiteState: WebsiteState,
  domainConnectionStatus: DomainConnectionStatus | undefined,
): StatusDisplay {
  if (websiteState === 'none') return { label: 'Setup required', tone: 'amber' };
  if (domainConnectionStatus && DOMAIN_IN_PROGRESS_STATUSES.includes(domainConnectionStatus)) {
    return { label: 'Domain pending', tone: 'amber' };
  }
  if (websiteState === 'draft') return { label: 'Draft changes', tone: 'amber' };
  return { label: 'Live', tone: 'green' };
}

export function formatDate(iso: string | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatDateTime(iso: string | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
