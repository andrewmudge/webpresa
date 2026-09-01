import 'server-only';
import { getVercelApiSecret } from '@/lib/secrets';
import { vercelFetch } from '@/lib/vercel/client';

/**
 * Website-visitor trend for the admin analytics dashboard's dedicated
 * "Website Visitors" card — the only two pages tracked are the homepage
 * (`/`) and the self-service build funnel's landing page (`/build`, never
 * `/build/[buildId]`), per `app/components/TrackedPageAnalytics.tsx`'s
 * mount-time scoping. Backed entirely by Vercel's own Web Analytics REST
 * API (`visits/aggregate`) — no new AWS infra, reusing the same
 * `vercelFetch`/`getVercelApiSecret` credentials `lib/vercel/domains.ts`
 * already uses for domain-connection calls.
 *
 * Deliberately a separate preset set from `dashboard-types.ts`'s
 * `DATE_RANGE_PRESETS` (`7d/30d/90d/ytd/all/custom`) — that set governs
 * every *other* card on the page via the shared `FilterBar`; this card's
 * range is independent (week/month/3month/6month/year/custom), matching
 * `PostcardMapCard`'s precedent for a card with its own local filter.
 */

export const VISITOR_RANGE_PRESETS = ['week', 'month', '3month', '6month', 'year', 'custom'] as const;
export type VisitorRangePreset = (typeof VISITOR_RANGE_PRESETS)[number];

export const VISITOR_RANGE_PRESET_LABELS: Record<VisitorRangePreset, string> = {
  week: 'Last 7 days',
  month: 'Last 30 days',
  '3month': 'Last 3 months',
  '6month': 'Last 6 months',
  year: 'Last 12 months',
  custom: 'Custom range',
};

export interface VisitorsFilters {
  range: VisitorRangePreset;
  customFrom?: string;
  customTo?: string;
}

type VisitorGranularity = 'day' | 'week' | 'month';

interface ResolvedVisitorRange {
  since: string;
  until: string;
  granularity: VisitorGranularity;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const RELATIVE_RANGE_DAYS: Record<'week' | 'month' | '3month' | '6month' | 'year', number> = {
  week: 7,
  month: 30,
  '3month': 90,
  '6month': 180,
  year: 365,
};

const RELATIVE_RANGE_GRANULARITY: Record<'week' | 'month' | '3month' | '6month' | 'year', VisitorGranularity> = {
  week: 'day',
  month: 'day',
  '3month': 'week',
  '6month': 'week',
  year: 'month',
};

function pickCustomGranularity(spanDays: number): VisitorGranularity {
  if (spanDays <= 31) return 'day';
  if (spanDays <= 180) return 'week';
  return 'month';
}

/** `YYYY-MM-DD` only — anything else (missing, malformed, invalid calendar date) returns `null` so the caller can fall back rather than throw. */
function parseDateOnly(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Pure date-window resolution, no I/O — mirrors `lib/analytics/date-range.ts`'s
 * `resolveDateRange`: every boundary is a half-open `[since, until)` UTC ISO
 * range, and malformed/missing/reversed custom input silently falls back to
 * the `month` default rather than throwing.
 */
export function resolveVisitorDateRange(filters: VisitorsFilters, now: Date = new Date()): ResolvedVisitorRange {
  const nowIso = now.toISOString();

  if (filters.range !== 'custom') {
    const days = RELATIVE_RANGE_DAYS[filters.range];
    const since = new Date(now.getTime() - days * DAY_MS);
    return { since: since.toISOString(), until: nowIso, granularity: RELATIVE_RANGE_GRANULARITY[filters.range] };
  }

  const start = parseDateOnly(filters.customFrom);
  const endDay = parseDateOnly(filters.customTo);
  if (!start || !endDay || start.getTime() > endDay.getTime()) {
    return resolveVisitorDateRange({ range: 'month' }, now);
  }
  // customTo is the last INCLUDED day, so `until` is that day + 1.
  const until = new Date(endDay.getTime() + DAY_MS);
  const spanDays = Math.round((until.getTime() - start.getTime()) / DAY_MS);

  return { since: start.toISOString(), until: until.toISOString(), granularity: pickCustomGranularity(spanDays) };
}

function isVisitorRangePreset(value: string): value is VisitorRangePreset {
  return (VISITOR_RANGE_PRESETS as readonly string[]).includes(value);
}

/** Missing/unrecognized values are simply omitted (falls back to `month`) — never throws on a malformed query string. */
export function parseVisitorsFiltersFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): VisitorsFilters {
  const get = (key: string): string | undefined => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const rangeRaw = get('visitorsRange');
  const range = rangeRaw && isVisitorRangePreset(rangeRaw) ? rangeRaw : 'month';

  return { range, customFrom: get('visitorsFrom'), customTo: get('visitorsTo') };
}

export interface VisitorTrendPoint {
  /** ISO timestamp of the bucket start, as returned by Vercel. */
  date: string;
  /** Short human label for the chart's x-axis. */
  label: string;
  home: number;
  build: number;
}

export interface VisitorTrendSeries {
  points: VisitorTrendPoint[];
}

const TRACKED_ROUTES = ['/', '/build'] as const;
type TrackedRoute = (typeof TRACKED_ROUTES)[number];

function isTrackedRoute(value: string | undefined): value is TrackedRoute {
  return !!value && (TRACKED_ROUTES as readonly string[]).includes(value);
}

interface VercelVisitsAggregateRow {
  timestamp: string;
  route?: string;
  visitors?: number;
  pageviews?: number;
}

interface VercelVisitsAggregateResponse {
  data: VercelVisitsAggregateRow[];
}

function formatLabel(timestamp: string, granularity: VisitorGranularity): string {
  const date = new Date(timestamp);
  if (granularity === 'month') {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/**
 * Queries Vercel's Web Analytics API for the two pages this card tracks,
 * merging both routes' series into one point per timestamp — a timestamp
 * missing a row for one route (e.g. a zero-traffic day) fills that side
 * with `0` rather than leaving a gap, so the chart never has a broken
 * point. One request covers both pages via the endpoint's two-dimension
 * grouping (`by=<granularity>,route`), not two separate requests.
 */
export async function getWebsiteVisitorTrend(range: ResolvedVisitorRange): Promise<VisitorTrendSeries> {
  const { projectId } = await getVercelApiSecret();

  const params = new URLSearchParams({
    projectId,
    since: range.since,
    until: range.until,
    filter: "route eq '/' or route eq '/build'",
  });
  params.append('by', range.granularity);
  params.append('by', 'route');

  const response = await vercelFetch<VercelVisitsAggregateResponse>(
    `/v1/query/web-analytics/visits/aggregate?${params.toString()}`,
  );

  const byTimestamp = new Map<string, VisitorTrendPoint>();
  for (const row of response.data) {
    if (!isTrackedRoute(row.route)) continue;
    const point = byTimestamp.get(row.timestamp) ?? {
      date: row.timestamp,
      label: formatLabel(row.timestamp, range.granularity),
      home: 0,
      build: 0,
    };
    if (row.route === '/') point.home = row.visitors ?? 0;
    if (row.route === '/build') point.build = row.visitors ?? 0;
    byTimestamp.set(row.timestamp, point);
  }

  const points = Array.from(byTimestamp.values()).sort((a, b) => a.date.localeCompare(b.date));
  return { points };
}
