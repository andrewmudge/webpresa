import type { Business } from '@/domain/models/business';
import type { SitePreview } from '@/domain/models/site-preview';
import type { DomainConnection } from '@/domain/models/domain-connection';
import type { WebsiteState } from '@/lib/customer-editing/site-status';
import type { BadgeTone } from './FormBits';
import { resolveSubscriptionBadge, formatDate, formatDateTime } from './billing/status';

/**
 * View-model layer for the Overview ("Website Health") dashboard — pure
 * functions, no JSX, no fetching. `page.tsx` loads data once and calls these
 * to derive typed, truthful presentation state. See implementation.md,
 * "Overview dashboard" for the constraints these encode: no fabricated
 * uptime/cert-expiry/contact-form-verification, and the top Website card
 * intentionally stays "Live" while a draft is pending (unlike
 * `billing/status.ts`'s `resolveWebsiteOverallStatus`, which downgrades to
 * "Draft changes" — a deliberate, page-scoped divergence, not a bug).
 */

export interface StatusDisplay {
  label: string;
  tone: BadgeTone;
}

export interface DescribedStatus extends StatusDisplay {
  description: string;
}

export type WebsiteHealthState = 'healthy' | 'attention' | 'critical' | 'unknown';

export interface WebsiteHealthItem {
  id: string;
  label: string;
  description: string;
  state: WebsiteHealthState;
}

export type OverviewActionKind =
  | { kind: 'link'; href: string }
  | { kind: 'publish'; previewId: string }
  | { kind: 'billing_portal' };

export interface OverviewActionItem {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  action: OverviewActionKind;
}

export interface ActivityEntry {
  id: string;
  label: string;
  timestamp: string;
}

export type HealthSummaryTone = 'healthy' | 'attention' | 'critical' | 'setup';

export interface HealthSummary {
  tone: HealthSummaryTone;
  message: string;
}

/** Only the fields these view functions actually read — keeps them cheap to unit-test without constructing a full `DomainConnection`/`SitePreview`. */
export type DomainConnectionSummary = Pick<DomainConnection, 'status' | 'primaryHostname' | 'createdAt' | 'activatedAt'>;
export type SitePreviewSummary = Pick<SitePreview, 'previewId' | 'updatedAt'>;

// ---------------------------------------------------------------------------
// Top status cards
// ---------------------------------------------------------------------------

/**
 * "Live" whenever a published version exists — a newer, unpublished draft
 * does not downgrade this. Draft state is surfaced separately in the
 * Website Health checklist and Action Required, not by this top-level badge.
 */
export function resolveWebsiteCardStatus(websiteState: WebsiteState): DescribedStatus {
  if (websiteState === 'none') {
    return { label: 'Unpublished', tone: 'amber', description: 'Your website has not been published yet.' };
  }
  return { label: 'Live', tone: 'green', description: 'Your website is published and online.' };
}

/**
 * A missing/disconnected custom domain is never treated as a problem — the
 * business is still reachable at its Webpresa-hosted address.
 */
export function resolveDomainCardStatus(domainConnection: DomainConnectionSummary | null, hostedUrl: string): DescribedStatus {
  if (!domainConnection) {
    return { label: 'Webpresa domain active', tone: 'green', description: `Your website is available at ${hostedUrl}.` };
  }
  if (domainConnection.status === 'active') {
    return { label: 'Connected', tone: 'green', description: `Your website is available at ${domainConnection.primaryHostname}.` };
  }
  if (domainConnection.status === 'failed' || domainConnection.status === 'expired') {
    return { label: 'Failed', tone: 'red', description: "We couldn't finish connecting this domain." };
  }
  return { label: 'Pending', tone: 'amber', description: 'Your domain is still being connected.' };
}

/**
 * No dedicated SSL/certificate field exists in this app. A Webpresa-hosted
 * site is unconditionally HTTPS by the shared deployment (a static
 * guarantee, not a per-business check). A custom domain reuses its
 * `DomainConnection.status` — the only real signal available — rather than
 * a fabricated certificate-expiry date.
 */
export function resolveSslCardStatus(domainConnection: DomainConnectionSummary | null): DescribedStatus {
  if (!domainConnection) {
    return { label: 'Secure', tone: 'green', description: 'Your Webpresa-hosted website uses HTTPS automatically.' };
  }
  if (domainConnection.status === 'active') {
    return { label: 'Secure', tone: 'green', description: 'Your custom domain has an active SSL certificate.' };
  }
  if (domainConnection.status === 'certificate_pending') {
    return { label: 'Pending', tone: 'amber', description: 'Your SSL certificate is being issued.' };
  }
  if (domainConnection.status === 'failed' || domainConnection.status === 'expired') {
    return { label: 'Issue detected', tone: 'red', description: "We couldn't secure this domain." };
  }
  return { label: 'Not configured', tone: 'gray', description: 'SSL will be configured once your domain connects.' };
}

/**
 * Wraps the existing `resolveSubscriptionBadge`, folding a scheduled
 * cancellation into this card's own text instead of a separate banner.
 */
export function resolveSubscriptionCardStatus(
  business: Pick<Business, 'subscriptionStatus' | 'cancelAtPeriodEnd' | 'currentPeriodEnd'>,
): DescribedStatus {
  const badge = resolveSubscriptionBadge(business.subscriptionStatus);
  const periodEndDisplay = formatDate(business.currentPeriodEnd);
  if (business.subscriptionStatus === 'active' && business.cancelAtPeriodEnd && periodEndDisplay) {
    return { label: badge.label, tone: 'amber', description: `Cancels ${periodEndDisplay}.` };
  }
  if (business.subscriptionStatus === 'active' && periodEndDisplay) {
    return { label: badge.label, tone: badge.tone, description: `Renews ${periodEndDisplay}.` };
  }
  return { label: badge.label, tone: badge.tone, description: badge.label === 'Not activated' ? 'No active subscription.' : '' };
}

// ---------------------------------------------------------------------------
// Website Health checklist
// ---------------------------------------------------------------------------

const SSL_TONE_TO_HEALTH_STATE: Record<BadgeTone, WebsiteHealthState> = {
  green: 'healthy',
  amber: 'attention',
  red: 'critical',
  gray: 'unknown',
  blue: 'unknown',
};

export function buildWebsiteHealthItems(params: {
  websiteState: WebsiteState;
  hasDraft: boolean;
  publishedPreview: SitePreviewSummary | undefined;
  domainConnection: DomainConnectionSummary | null;
  business: Pick<Business, 'phone' | 'email'>;
}): WebsiteHealthItem[] {
  const { websiteState, hasDraft, publishedPreview, domainConnection, business } = params;
  const items: WebsiteHealthItem[] = [];

  items.push(
    websiteState === 'none'
      ? { id: 'published', label: 'Not published yet', description: 'Publish your website to make it live.', state: 'attention' }
      : { id: 'published', label: 'Published online', description: 'Your website has an active published version.', state: 'healthy' },
  );

  items.push(
    hasDraft
      ? { id: 'draft', label: 'Unpublished changes', description: 'Your saved changes have not been published.', state: 'attention' }
      : { id: 'draft', label: 'Latest changes published', description: 'Everything you have saved is live.', state: 'healthy' },
  );

  items.push({
    id: 'responsive',
    label: 'Responsive layout enabled',
    description: 'Your Webpresa template is designed for mobile devices.',
    state: 'healthy',
  });

  const ssl = resolveSslCardStatus(domainConnection);
  items.push({
    id: 'ssl',
    label: ssl.tone === 'green' ? 'SSL active' : ssl.label,
    description: ssl.description,
    state: SSL_TONE_TO_HEALTH_STATE[ssl.tone],
  });

  if (!domainConnection) {
    items.push({
      id: 'domain',
      label: 'Using Webpresa domain',
      description: 'Connect a custom domain anytime from your Domain settings.',
      state: 'healthy',
    });
  } else if (domainConnection.status === 'active') {
    items.push({
      id: 'domain',
      label: 'Domain connected',
      description: `${domainConnection.primaryHostname} is connected and active.`,
      state: 'healthy',
    });
  } else if (domainConnection.status === 'failed' || domainConnection.status === 'expired') {
    items.push({
      id: 'domain',
      label: 'Domain connection failed',
      description: "We couldn't finish connecting your domain.",
      state: 'critical',
    });
  } else {
    items.push({
      id: 'domain',
      label: 'Domain setup in progress',
      description: 'Your domain is still being connected.',
      state: 'attention',
    });
  }

  const hasContactDetails = Boolean(business.phone || business.email);
  items.push(
    hasContactDetails
      ? {
          id: 'contact',
          label: 'Contact details published',
          description: 'Customers can reach you by phone or email from your website.',
          state: 'healthy',
        }
      : {
          id: 'contact',
          label: 'No contact details yet',
          description: 'Add a phone number or email so customers can reach you.',
          state: 'unknown',
        },
  );

  if (publishedPreview) {
    items.push({
      id: 'last-published',
      label: 'Last published',
      description: formatDateTime(publishedPreview.updatedAt) ?? '—',
      state: 'healthy',
    });
  }

  return items;
}

/** Priority: critical > setup (never published) > attention > healthy. `unknown` items never degrade the summary — they represent missing data, not a known problem. */
export function computeHealthSummary(items: WebsiteHealthItem[], websiteState: WebsiteState): HealthSummary {
  if (items.some((item) => item.state === 'critical')) {
    return { tone: 'critical', message: 'We found an issue that may affect your website.' };
  }
  if (websiteState === 'none') {
    return { tone: 'setup', message: 'Your website setup is not complete.' };
  }
  if (items.some((item) => item.state === 'attention')) {
    return { tone: 'attention', message: 'A few items need your attention.' };
  }
  return { tone: 'healthy', message: 'Everything looks good.' };
}

/** Header subtext, adapted from the same summary tone driving the Website Health card. */
export function resolveGreetingSubtext(summary: HealthSummary): string {
  switch (summary.tone) {
    case 'attention':
      return 'Your website is online, but a few items need your attention.';
    case 'setup':
      return "Let's finish setting up your website.";
    case 'critical':
      return 'We found an issue that may affect your website.';
    case 'healthy':
    default:
      return 'Your website is online and everything looks good.';
  }
}

// ---------------------------------------------------------------------------
// Action Required
// ---------------------------------------------------------------------------

export function buildActionItems(params: {
  hasDraft: boolean;
  websiteState: WebsiteState;
  latest: SitePreviewSummary | undefined;
  domainConnection: DomainConnectionSummary | null;
  isReadOnly: boolean;
  businessId: string;
}): OverviewActionItem[] {
  const { hasDraft, websiteState, latest, domainConnection, isReadOnly, businessId } = params;
  const items: OverviewActionItem[] = [];

  if (!isReadOnly && hasDraft && latest) {
    items.push({
      id: 'publish-draft',
      title: 'You have unpublished changes',
      description: 'Publish your latest changes to make them live.',
      actionLabel: 'Publish Changes',
      action: { kind: 'publish', previewId: latest.previewId },
    });
  } else if (!isReadOnly && websiteState === 'none' && latest) {
    items.push({
      id: 'publish-first',
      title: 'Publish your website',
      description: 'Your site is ready — publish it to make it live.',
      actionLabel: 'Publish Changes',
      action: { kind: 'publish', previewId: latest.previewId },
    });
  }

  if (domainConnection?.status === 'failed' || domainConnection?.status === 'expired') {
    items.push({
      id: 'domain-failed',
      title: 'Resolve your domain connection',
      description: "We couldn't finish connecting your domain. Review and try again.",
      actionLabel: 'Manage Domain',
      action: { kind: 'link', href: `/app/onboarding/${businessId}/domain` },
    });
  } else if (domainConnection?.status === 'awaiting_dns') {
    items.push({
      id: 'domain-dns',
      title: "Finish your domain's DNS setup",
      description: 'Add the DNS records at your registrar to finish connecting your domain.',
      actionLabel: 'Manage Domain',
      action: { kind: 'link', href: `/app/onboarding/${businessId}/domain` },
    });
  }

  if (isReadOnly) {
    items.push({
      id: 'payment',
      title: 'Payment needs attention',
      description: 'Update your payment method to keep your subscription active.',
      actionLabel: 'Manage Billing',
      action: { kind: 'billing_portal' },
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Recent Activity — synthesized from existing record timestamps; there is no
// dedicated activity/event log in this app. Subscription events are
// deliberately excluded: `Business.lastStripeEventAt` is documented as
// diagnostics-only and isn't tied to a specific event type, so labeling it
// "Subscription renewed" (or similar) could misrepresent what happened.
// ---------------------------------------------------------------------------

export function buildRecentActivity(params: {
  publishedPreview: SitePreviewSummary | undefined;
  hasDraft: boolean;
  latest: SitePreviewSummary | undefined;
  domainConnection: DomainConnectionSummary | null;
  claimedAt: string | undefined;
}): ActivityEntry[] {
  const { publishedPreview, hasDraft, latest, domainConnection, claimedAt } = params;
  const entries: ActivityEntry[] = [];

  if (publishedPreview) entries.push({ id: 'published', label: 'Website published', timestamp: publishedPreview.updatedAt });
  if (hasDraft && latest) entries.push({ id: 'draft-saved', label: 'Draft saved', timestamp: latest.updatedAt });
  if (domainConnection) entries.push({ id: 'domain-started', label: 'Domain setup started', timestamp: domainConnection.createdAt });
  if (domainConnection?.activatedAt) {
    entries.push({ id: 'domain-connected', label: 'Domain connected', timestamp: domainConnection.activatedAt });
  }
  if (claimedAt) entries.push({ id: 'claimed', label: 'Website claimed', timestamp: claimedAt });

  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5);
}

export { formatDate, formatDateTime };
