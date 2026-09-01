/**
 * Unit tests for the website-visitors analytics module. `vercelFetch` and
 * `getVercelApiSecret` are mocked at the boundary — no real Vercel API
 * calls — mirroring the mocking style `lib/ai/__tests__/generate-preview.test.ts`
 * already uses for its own external-call boundaries.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockVercelFetch = vi.hoisted(() => vi.fn());
const mockGetVercelApiSecret = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('@/lib/vercel/client', () => ({ vercelFetch: mockVercelFetch }));
vi.mock('@/lib/secrets', () => ({ getVercelApiSecret: mockGetVercelApiSecret }));

import {
  resolveVisitorDateRange,
  parseVisitorsFiltersFromSearchParams,
  getWebsiteVisitorTrend,
} from '@/lib/analytics/vercel-visitors';

const NOW = new Date('2026-09-01T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetVercelApiSecret.mockResolvedValue({ accessToken: 'token', teamId: 'team_1', projectId: 'prj_1' });
});

describe('resolveVisitorDateRange', () => {
  it.each([
    ['week', 7, 'day'],
    ['month', 30, 'day'],
    ['3month', 90, 'week'],
    ['6month', 180, 'week'],
    ['year', 365, 'month'],
  ] as const)('resolves the %s preset to the last %d days at %s granularity', (range, days, granularity) => {
    const result = resolveVisitorDateRange({ range }, NOW);
    expect(result.until).toBe(NOW.toISOString());
    expect(new Date(result.since).getTime()).toBe(NOW.getTime() - days * DAY_MS);
    expect(result.granularity).toBe(granularity);
  });

  it('resolves a custom range with customTo as the last INCLUDED day', () => {
    const result = resolveVisitorDateRange({ range: 'custom', customFrom: '2026-08-01', customTo: '2026-08-05' }, NOW);
    expect(result.since).toBe('2026-08-01T00:00:00.000Z');
    expect(result.until).toBe('2026-08-06T00:00:00.000Z');
  });

  it('picks day granularity for a custom span of 31 days or less', () => {
    const result = resolveVisitorDateRange({ range: 'custom', customFrom: '2026-08-01', customTo: '2026-08-31' }, NOW);
    expect(result.granularity).toBe('day');
  });

  it('picks week granularity for a custom span between 32 and 180 days', () => {
    const result = resolveVisitorDateRange({ range: 'custom', customFrom: '2026-06-01', customTo: '2026-08-31' }, NOW);
    expect(result.granularity).toBe('week');
  });

  it('picks month granularity for a custom span over 180 days', () => {
    const result = resolveVisitorDateRange({ range: 'custom', customFrom: '2025-01-01', customTo: '2026-08-31' }, NOW);
    expect(result.granularity).toBe('month');
  });

  it.each([
    ['missing customFrom/customTo', { range: 'custom' as const }],
    ['malformed customFrom', { range: 'custom' as const, customFrom: 'not-a-date', customTo: '2026-08-05' }],
    ['reversed range', { range: 'custom' as const, customFrom: '2026-08-10', customTo: '2026-08-01' }],
  ])('falls back to the month default on %s', (_label, filters) => {
    const result = resolveVisitorDateRange(filters, NOW);
    const monthDefault = resolveVisitorDateRange({ range: 'month' }, NOW);
    expect(result).toEqual(monthDefault);
  });
});

describe('parseVisitorsFiltersFromSearchParams', () => {
  it('parses a recognized range value', () => {
    expect(parseVisitorsFiltersFromSearchParams({ visitorsRange: '6month' })).toEqual({
      range: '6month',
      customFrom: undefined,
      customTo: undefined,
    });
  });

  it('defaults to month when the range is missing or unrecognized', () => {
    expect(parseVisitorsFiltersFromSearchParams({})).toEqual({ range: 'month', customFrom: undefined, customTo: undefined });
    expect(parseVisitorsFiltersFromSearchParams({ visitorsRange: 'decade' })).toEqual({
      range: 'month',
      customFrom: undefined,
      customTo: undefined,
    });
  });

  it('takes the first value when a param arrives as an array', () => {
    expect(parseVisitorsFiltersFromSearchParams({ visitorsRange: ['year', 'week'] })).toEqual({
      range: 'year',
      customFrom: undefined,
      customTo: undefined,
    });
  });

  it('passes through customFrom/customTo', () => {
    expect(
      parseVisitorsFiltersFromSearchParams({ visitorsRange: 'custom', visitorsFrom: '2026-01-01', visitorsTo: '2026-01-31' }),
    ).toEqual({ range: 'custom', customFrom: '2026-01-01', customTo: '2026-01-31' });
  });
});

describe('getWebsiteVisitorTrend', () => {
  it('queries with projectId, since/until, by=granularity+route, and a route filter', async () => {
    mockVercelFetch.mockResolvedValueOnce({ data: [] });

    await getWebsiteVisitorTrend({ since: '2026-08-01T00:00:00.000Z', until: '2026-08-08T00:00:00.000Z', granularity: 'day' });

    expect(mockVercelFetch).toHaveBeenCalledTimes(1);
    const [calledPath] = mockVercelFetch.mock.calls[0] as [string];
    const [pathname, queryString] = calledPath.split('?');
    const params = new URLSearchParams(queryString);

    expect(pathname).toBe('/v1/query/web-analytics/visits/aggregate');
    expect(params.get('projectId')).toBe('prj_1');
    expect(params.get('since')).toBe('2026-08-01T00:00:00.000Z');
    expect(params.get('until')).toBe('2026-08-08T00:00:00.000Z');
    expect(params.getAll('by')).toEqual(['day', 'route']);
    expect(params.get('filter')).toBe("route eq '/' or route eq '/build'");
  });

  it('merges rows for / and /build into one point per timestamp, filling a missing route with 0', async () => {
    mockVercelFetch.mockResolvedValueOnce({
      data: [
        { timestamp: '2026-08-01T00:00:00.000Z', route: '/', visitors: 40, pageviews: 55 },
        { timestamp: '2026-08-01T00:00:00.000Z', route: '/build', visitors: 12, pageviews: 15 },
        { timestamp: '2026-08-02T00:00:00.000Z', route: '/', visitors: 30, pageviews: 30 },
      ],
    });

    const result = await getWebsiteVisitorTrend({
      since: '2026-08-01T00:00:00.000Z',
      until: '2026-08-03T00:00:00.000Z',
      granularity: 'day',
    });

    expect(result.points).toHaveLength(2);
    expect(result.points[0]).toMatchObject({ date: '2026-08-01T00:00:00.000Z', home: 40, build: 12 });
    expect(result.points[1]).toMatchObject({ date: '2026-08-02T00:00:00.000Z', home: 30, build: 0 });
  });

  it('ignores rows for routes other than / and /build', async () => {
    mockVercelFetch.mockResolvedValueOnce({
      data: [
        { timestamp: '2026-08-01T00:00:00.000Z', route: '/pricing', visitors: 99, pageviews: 99 },
        { timestamp: '2026-08-01T00:00:00.000Z', route: '/', visitors: 10, pageviews: 10 },
      ],
    });

    const result = await getWebsiteVisitorTrend({
      since: '2026-08-01T00:00:00.000Z',
      until: '2026-08-03T00:00:00.000Z',
      granularity: 'day',
    });

    expect(result.points).toHaveLength(1);
    expect(result.points[0]).toMatchObject({ home: 10, build: 0 });
  });

  it('returns points sorted ascending by timestamp regardless of response order', async () => {
    mockVercelFetch.mockResolvedValueOnce({
      data: [
        { timestamp: '2026-08-03T00:00:00.000Z', route: '/', visitors: 3, pageviews: 3 },
        { timestamp: '2026-08-01T00:00:00.000Z', route: '/', visitors: 1, pageviews: 1 },
        { timestamp: '2026-08-02T00:00:00.000Z', route: '/', visitors: 2, pageviews: 2 },
      ],
    });

    const result = await getWebsiteVisitorTrend({
      since: '2026-08-01T00:00:00.000Z',
      until: '2026-08-04T00:00:00.000Z',
      granularity: 'day',
    });

    expect(result.points.map((p) => p.date)).toEqual([
      '2026-08-01T00:00:00.000Z',
      '2026-08-02T00:00:00.000Z',
      '2026-08-03T00:00:00.000Z',
    ]);
  });
});
