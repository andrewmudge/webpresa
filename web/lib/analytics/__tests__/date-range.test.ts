import { describe, it, expect } from 'vitest';
import { resolveDateRange, parseFiltersFromSearchParams } from '../date-range';

const NOW = new Date('2026-08-20T12:00:00.000Z');

describe('resolveDateRange', () => {
  it('7d resolves to a 7-day window with an equal-length preceding comparison window', () => {
    const window = resolveDateRange({ datePreset: '7d' }, NOW);
    expect(window.end).toBe(NOW.toISOString());
    expect(window.start).toBe('2026-08-13T12:00:00.000Z');
    expect(window.previousEnd).toBe(window.start);
    expect(window.previousStart).toBe('2026-08-06T12:00:00.000Z');
    expect(window.comparisonAvailable).toBe(true);
  });

  it('30d resolves to a 30-day window', () => {
    const window = resolveDateRange({ datePreset: '30d' }, NOW);
    expect(window.start).toBe('2026-07-21T12:00:00.000Z');
    expect(window.comparisonAvailable).toBe(true);
  });

  it('90d resolves to a 90-day window', () => {
    const window = resolveDateRange({ datePreset: '90d' }, NOW);
    expect(window.start).toBe('2026-05-22T12:00:00.000Z');
    expect(window.comparisonAvailable).toBe(true);
  });

  it('ytd starts at Jan 1 UTC of the current year with no comparison window', () => {
    const window = resolveDateRange({ datePreset: 'ytd' }, NOW);
    expect(window.start).toBe('2026-01-01T00:00:00.000Z');
    expect(window.end).toBe(NOW.toISOString());
    expect(window.comparisonAvailable).toBe(false);
    expect(window.previousStart).toBeUndefined();
    expect(window.previousEnd).toBeUndefined();
  });

  it('all starts at the Unix epoch with no comparison window', () => {
    const window = resolveDateRange({ datePreset: 'all' }, NOW);
    expect(window.start).toBe(new Date(0).toISOString());
    expect(window.comparisonAvailable).toBe(false);
  });

  it('custom range includes the entire "to" day and computes an equal-length preceding comparison window', () => {
    const window = resolveDateRange({ datePreset: 'custom', customFrom: '2026-08-01', customTo: '2026-08-10' }, NOW);
    expect(window.start).toBe('2026-08-01T00:00:00.000Z');
    expect(window.end).toBe('2026-08-11T00:00:00.000Z'); // exclusive boundary, one day past the inclusive "to" day
    expect(window.previousEnd).toBe('2026-08-01T00:00:00.000Z');
    expect(window.previousStart).toBe('2026-07-22T00:00:00.000Z'); // same 10-day duration immediately before
    expect(window.comparisonAvailable).toBe(true);
  });

  it('falls back to the 30d default when customFrom/customTo are missing', () => {
    const window = resolveDateRange({ datePreset: 'custom' }, NOW);
    expect(window.start).toBe('2026-07-21T12:00:00.000Z');
  });

  it('falls back to the 30d default when customFrom is after customTo', () => {
    const window = resolveDateRange({ datePreset: 'custom', customFrom: '2026-08-10', customTo: '2026-08-01' }, NOW);
    expect(window.start).toBe('2026-07-21T12:00:00.000Z');
  });

  it('falls back to the 30d default on a malformed custom date string', () => {
    const window = resolveDateRange({ datePreset: 'custom', customFrom: 'not-a-date', customTo: '2026-08-10' }, NOW);
    expect(window.start).toBe('2026-07-21T12:00:00.000Z');
  });
});

describe('parseFiltersFromSearchParams', () => {
  it('defaults to 30d when datePreset is missing or unrecognized', () => {
    expect(parseFiltersFromSearchParams({}).datePreset).toBe('30d');
    expect(parseFiltersFromSearchParams({ datePreset: 'bogus' }).datePreset).toBe('30d');
  });

  it('accepts a valid datePreset', () => {
    expect(parseFiltersFromSearchParams({ datePreset: '90d' }).datePreset).toBe('90d');
  });

  it('omits industry/template when unrecognized, keeps them when valid', () => {
    const invalid = parseFiltersFromSearchParams({ industry: 'not-a-real-industry', template: 'not-a-real-template' });
    expect(invalid.industry).toBeUndefined();
    expect(invalid.templateVariant).toBeUndefined();

    const valid = parseFiltersFromSearchParams({ industry: 'plumbing', template: 'has_website' });
    expect(valid.industry).toBe('plumbing');
    expect(valid.templateVariant).toBe('has_website');
  });

  it('takes the first value when a param arrives as an array', () => {
    const filters = parseFiltersFromSearchParams({ datePreset: ['7d', '30d'] });
    expect(filters.datePreset).toBe('7d');
  });

  it('passes through campaignId and custom range strings verbatim', () => {
    const filters = parseFiltersFromSearchParams({ campaignId: 'campaign_1', customFrom: '2026-08-01', customTo: '2026-08-10' });
    expect(filters.campaignId).toBe('campaign_1');
    expect(filters.customFrom).toBe('2026-08-01');
    expect(filters.customTo).toBe('2026-08-10');
  });
});
