import { describe, it, expect } from 'vitest';
import {
  resolveSubscriptionBadge,
  resolveWebsiteOverallStatus,
  formatDate,
  formatDateTime,
} from '../status';

describe('resolveSubscriptionBadge', () => {
  it('maps active to a green "Active" badge', () => {
    expect(resolveSubscriptionBadge('active')).toEqual({ label: 'Active', tone: 'green' });
  });

  it('maps past_due to an amber "Payment problem" badge', () => {
    expect(resolveSubscriptionBadge('past_due')).toEqual({ label: 'Payment problem', tone: 'amber' });
  });

  it('maps canceled to a gray "Canceled" badge', () => {
    expect(resolveSubscriptionBadge('canceled')).toEqual({ label: 'Canceled', tone: 'gray' });
  });

  it('maps a missing status to "Not activated"', () => {
    expect(resolveSubscriptionBadge(undefined)).toEqual({ label: 'Not activated', tone: 'gray' });
  });
});

describe('resolveWebsiteOverallStatus', () => {
  it('shows "Setup required" when nothing has ever been published, regardless of domain state', () => {
    expect(resolveWebsiteOverallStatus('none', undefined)).toEqual({ label: 'Setup required', tone: 'amber' });
    expect(resolveWebsiteOverallStatus('none', 'active')).toEqual({ label: 'Setup required', tone: 'amber' });
  });

  it('shows "Domain pending" while a domain connection is actively in progress', () => {
    for (const status of ['draft', 'awaiting_dns', 'verifying', 'connected', 'certificate_pending'] as const) {
      expect(resolveWebsiteOverallStatus('live', status)).toEqual({ label: 'Domain pending', tone: 'amber' });
    }
  });

  it('shows "Draft changes" when the website has unpublished changes and no domain is in progress', () => {
    expect(resolveWebsiteOverallStatus('draft', undefined)).toEqual({ label: 'Draft changes', tone: 'amber' });
  });

  it('shows "Live" when published and no domain is in progress', () => {
    expect(resolveWebsiteOverallStatus('live', undefined)).toEqual({ label: 'Live', tone: 'green' });
    expect(resolveWebsiteOverallStatus('live', 'active')).toEqual({ label: 'Live', tone: 'green' });
  });

  it('does not let a failed or disconnected domain block a "Live" badge', () => {
    expect(resolveWebsiteOverallStatus('live', 'failed')).toEqual({ label: 'Live', tone: 'green' });
    expect(resolveWebsiteOverallStatus('live', 'disconnected')).toEqual({ label: 'Live', tone: 'green' });
  });
});

describe('formatDate', () => {
  it('returns null for a missing value', () => {
    expect(formatDate(undefined)).toBeNull();
  });

  it('formats an ISO date as a long-form date', () => {
    // Noon UTC avoids day-boundary flakiness across the test runner's timezone.
    expect(formatDate('2026-09-02T12:00:00.000Z')).toBe('September 2, 2026');
  });
});

describe('formatDateTime', () => {
  it('returns null for a missing value', () => {
    expect(formatDateTime(undefined)).toBeNull();
  });

  it('formats an ISO timestamp with both date and time', () => {
    const result = formatDateTime('2026-08-02T15:42:00.000Z');
    expect(result).toContain('2026');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});
