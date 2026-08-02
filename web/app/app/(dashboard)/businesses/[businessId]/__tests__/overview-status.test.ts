import { describe, it, expect } from 'vitest';
import {
  resolveWebsiteCardStatus,
  resolveDomainCardStatus,
  resolveSslCardStatus,
  resolveSubscriptionCardStatus,
  buildWebsiteHealthItems,
  computeHealthSummary,
  resolveGreetingSubtext,
  buildActionItems,
  buildRecentActivity,
  type DomainConnectionSummary,
  type SitePreviewSummary,
} from '../overview-status';

const domain = (overrides: Partial<DomainConnectionSummary>): DomainConnectionSummary => ({
  status: 'active',
  primaryHostname: 'example.com',
  createdAt: '2026-07-01T00:00:00.000Z',
  activatedAt: undefined,
  ...overrides,
});

const preview = (overrides: Partial<SitePreviewSummary>): SitePreviewSummary => ({
  previewId: 'preview_1',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

describe('resolveWebsiteCardStatus', () => {
  it('shows "Live" when the website has ever been published', () => {
    expect(resolveWebsiteCardStatus('live')).toEqual({
      label: 'Live',
      tone: 'green',
      description: 'Your website is published and online.',
    });
  });

  it('still shows "Live" while a newer draft is unpublished — a draft never downgrades the top card', () => {
    expect(resolveWebsiteCardStatus('draft')).toEqual({
      label: 'Live',
      tone: 'green',
      description: 'Your website is published and online.',
    });
  });

  it('shows "Unpublished" when nothing has ever been published', () => {
    expect(resolveWebsiteCardStatus('none').label).toBe('Unpublished');
    expect(resolveWebsiteCardStatus('none').tone).toBe('amber');
  });
});

describe('resolveDomainCardStatus', () => {
  it('never implies the site is offline when there is no custom domain', () => {
    const result = resolveDomainCardStatus(null, '/b/acme-landscaping');
    expect(result.tone).toBe('green');
    expect(result.description).toBe('Your website is available at /b/acme-landscaping.');
  });

  it('shows "Connected" for an active custom domain', () => {
    const result = resolveDomainCardStatus(domain({ status: 'active', primaryHostname: 'acme.com' }), '/b/acme');
    expect(result).toEqual({ label: 'Connected', tone: 'green', description: 'Your website is available at acme.com.' });
  });

  it('shows "Failed" for failed or expired domains', () => {
    expect(resolveDomainCardStatus(domain({ status: 'failed' }), '/b/x').label).toBe('Failed');
    expect(resolveDomainCardStatus(domain({ status: 'expired' }), '/b/x').tone).toBe('red');
  });

  it('shows "Pending" for in-progress domain states', () => {
    expect(resolveDomainCardStatus(domain({ status: 'awaiting_dns' }), '/b/x').label).toBe('Pending');
  });
});

describe('resolveSslCardStatus', () => {
  it('guarantees "Secure" for a Webpresa-hosted site with no custom domain', () => {
    expect(resolveSslCardStatus(null)).toEqual({
      label: 'Secure',
      tone: 'green',
      description: 'Your Webpresa-hosted website uses HTTPS automatically.',
    });
  });

  it('shows "Secure" for an active custom domain', () => {
    expect(resolveSslCardStatus(domain({ status: 'active' })).label).toBe('Secure');
  });

  it('shows "Pending" while a certificate is being issued', () => {
    expect(resolveSslCardStatus(domain({ status: 'certificate_pending' })).tone).toBe('amber');
  });

  it('shows "Issue detected" for a failed or expired domain', () => {
    expect(resolveSslCardStatus(domain({ status: 'failed' })).label).toBe('Issue detected');
  });

  it('shows "Not configured" (unknown/gray) for a domain still early in setup, never fabricating "Secure"', () => {
    const result = resolveSslCardStatus(domain({ status: 'draft' }));
    expect(result.label).toBe('Not configured');
    expect(result.tone).toBe('gray');
  });
});

describe('resolveSubscriptionCardStatus', () => {
  it('shows "Active" with a renewal date', () => {
    const result = resolveSubscriptionCardStatus({
      subscriptionStatus: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: '2026-09-02T12:00:00.000Z',
    });
    expect(result.label).toBe('Active');
    expect(result.tone).toBe('green');
    expect(result.description).toBe('Renews September 2, 2026.');
  });

  it('folds a scheduled cancellation into this card\'s own amber text instead of a separate banner', () => {
    const result = resolveSubscriptionCardStatus({
      subscriptionStatus: 'active',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: '2026-09-02T12:00:00.000Z',
    });
    expect(result.tone).toBe('amber');
    expect(result.description).toBe('Cancels September 2, 2026.');
  });

  it('shows "Payment problem" (amber) for past_due', () => {
    const result = resolveSubscriptionCardStatus({ subscriptionStatus: 'past_due', cancelAtPeriodEnd: false, currentPeriodEnd: undefined });
    expect(result.label).toBe('Payment problem');
    expect(result.tone).toBe('amber');
  });
});

describe('buildWebsiteHealthItems', () => {
  const base = {
    websiteState: 'live' as const,
    hasDraft: false,
    publishedPreview: preview({ updatedAt: '2026-08-02T10:42:00.000Z' }),
    domainConnection: null,
    business: { phone: '5551234567', email: undefined },
  };

  it('reports every item healthy for a fully healthy, published, Webpresa-hosted site', () => {
    const items = buildWebsiteHealthItems(base);
    expect(items.find((i) => i.id === 'published')?.state).toBe('healthy');
    expect(items.find((i) => i.id === 'draft')?.state).toBe('healthy');
    expect(items.find((i) => i.id === 'ssl')?.state).toBe('healthy');
    expect(items.find((i) => i.id === 'domain')?.state).toBe('healthy');
    expect(items.find((i) => i.id === 'domain')?.label).toBe('Using Webpresa domain');
  });

  it('flags unpublished changes as attention', () => {
    const items = buildWebsiteHealthItems({ ...base, hasDraft: true });
    expect(items.find((i) => i.id === 'draft')).toMatchObject({ state: 'attention', label: 'Unpublished changes' });
  });

  it('flags never-published as attention', () => {
    const items = buildWebsiteHealthItems({ ...base, websiteState: 'none', publishedPreview: undefined });
    expect(items.find((i) => i.id === 'published')).toMatchObject({ state: 'attention', label: 'Not published yet' });
    expect(items.find((i) => i.id === 'last-published')).toBeUndefined();
  });

  it('flags a failed domain connection as critical, not merely attention', () => {
    const items = buildWebsiteHealthItems({ ...base, domainConnection: domain({ status: 'failed' }) });
    expect(items.find((i) => i.id === 'domain')).toMatchObject({ state: 'critical' });
  });

  it('relabels the contact check truthfully — this app has no submittable contact form, only tel/mailto links', () => {
    const withContact = buildWebsiteHealthItems(base).find((i) => i.id === 'contact');
    expect(withContact?.label).toBe('Contact details published');
    expect(withContact?.label).not.toMatch(/form/i);

    const withoutContact = buildWebsiteHealthItems({ ...base, business: { phone: undefined, email: undefined } }).find(
      (i) => i.id === 'contact',
    );
    expect(withoutContact?.state).toBe('unknown');
  });
});

describe('computeHealthSummary', () => {
  it('prioritizes critical over everything else', () => {
    const items = [
      { id: 'a', label: '', description: '', state: 'critical' as const },
      { id: 'b', label: '', description: '', state: 'attention' as const },
    ];
    expect(computeHealthSummary(items, 'live').tone).toBe('critical');
  });

  it('shows "setup" when nothing has ever been published, even with no attention items', () => {
    expect(computeHealthSummary([], 'none').tone).toBe('setup');
  });

  it('shows "attention" when any item needs attention (and nothing is critical/unpublished)', () => {
    const items = [{ id: 'a', label: '', description: '', state: 'attention' as const }];
    expect(computeHealthSummary(items, 'live').tone).toBe('attention');
  });

  it('does not let "unknown" items degrade the summary below healthy', () => {
    const items = [{ id: 'a', label: '', description: '', state: 'unknown' as const }];
    expect(computeHealthSummary(items, 'live').tone).toBe('healthy');
  });

  it('shows "healthy" when everything is healthy', () => {
    const items = [{ id: 'a', label: '', description: '', state: 'healthy' as const }];
    expect(computeHealthSummary(items, 'live')).toEqual({ tone: 'healthy', message: 'Everything looks good.' });
  });
});

describe('resolveGreetingSubtext', () => {
  it('maps every summary tone to distinct, honest copy', () => {
    expect(resolveGreetingSubtext({ tone: 'healthy', message: '' })).toMatch(/everything looks good/i);
    expect(resolveGreetingSubtext({ tone: 'attention', message: '' })).toMatch(/need your attention/i);
    expect(resolveGreetingSubtext({ tone: 'setup', message: '' })).toMatch(/finish setting up/i);
    expect(resolveGreetingSubtext({ tone: 'critical', message: '' })).toMatch(/issue/i);
  });
});

describe('buildActionItems', () => {
  const params = {
    hasDraft: false,
    websiteState: 'live' as const,
    latest: preview({ previewId: 'preview_latest' }),
    domainConnection: null as DomainConnectionSummary | null,
    isReadOnly: false,
    businessId: 'biz_1',
  };

  it('returns no items when everything is healthy — no empty-state panel is needed', () => {
    expect(buildActionItems(params)).toEqual([]);
  });

  it('surfaces "publish unpublished changes" only when a draft is pending', () => {
    const items = buildActionItems({ ...params, hasDraft: true });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'publish-draft', actionLabel: 'Publish Changes' });
    expect(items[0].action).toEqual({ kind: 'publish', previewId: 'preview_latest' });
  });

  it('surfaces "publish for the first time" when nothing has ever been published', () => {
    const items = buildActionItems({ ...params, websiteState: 'none' });
    expect(items[0].id).toBe('publish-first');
  });

  it('never proposes publishing while read-only (billing_recovery)', () => {
    const items = buildActionItems({ ...params, hasDraft: true, isReadOnly: true });
    expect(items.find((i) => i.id === 'publish-draft')).toBeUndefined();
  });

  it('surfaces a domain action for a failed connection, and a different one for awaiting_dns', () => {
    expect(buildActionItems({ ...params, domainConnection: domain({ status: 'failed' }) })[0].id).toBe('domain-failed');
    expect(buildActionItems({ ...params, domainConnection: domain({ status: 'awaiting_dns' }) })[0].id).toBe('domain-dns');
  });

  it('does not surface a domain action for states waiting on Webpresa/Vercel, not the customer', () => {
    expect(buildActionItems({ ...params, domainConnection: domain({ status: 'verifying' }) })).toEqual([]);
  });

  it('surfaces "Payment needs attention" when read-only', () => {
    const items = buildActionItems({ ...params, isReadOnly: true });
    expect(items).toEqual([
      {
        id: 'payment',
        title: 'Payment needs attention',
        description: 'Update your payment method to keep your subscription active.',
        actionLabel: 'Manage Billing',
        action: { kind: 'billing_portal' },
      },
    ]);
  });
});

describe('buildRecentActivity', () => {
  it('returns an empty list when nothing reliable exists', () => {
    expect(
      buildRecentActivity({
        publishedPreview: undefined,
        hasDraft: false,
        latest: undefined,
        domainConnection: null,
        claimedAt: undefined,
      }),
    ).toEqual([]);
  });

  it('sorts newest first and caps at 5 entries', () => {
    const entries = buildRecentActivity({
      publishedPreview: preview({ updatedAt: '2026-08-02T10:00:00.000Z' }),
      hasDraft: true,
      latest: preview({ updatedAt: '2026-08-02T12:00:00.000Z' }),
      domainConnection: domain({ createdAt: '2026-07-01T00:00:00.000Z', activatedAt: '2026-07-05T00:00:00.000Z' }),
      claimedAt: '2026-06-01T00:00:00.000Z',
    });
    expect(entries).toHaveLength(5);
    const timestamps = entries.map((e) => e.timestamp);
    expect(timestamps).toEqual([...timestamps].sort().reverse());
    expect(entries[0].label).toBe('Draft saved');
  });

  it('never fabricates a subscription-activity entry from diagnostics-only fields', () => {
    const entries = buildRecentActivity({
      publishedPreview: preview({}),
      hasDraft: false,
      latest: preview({}),
      domainConnection: null,
      claimedAt: undefined,
    });
    expect(entries.some((e) => /subscription/i.test(e.label))).toBe(false);
  });
});
