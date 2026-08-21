import { INDUSTRIES, type Industry } from '@/domain/constants/industries';
import { POSTCARD_TEMPLATE_VARIANTS, type PostcardTemplateVariant } from '@/domain/models/postcard';
import { DATE_RANGE_PRESETS, type AnalyticsFilters, type DateRangePreset, type ResolvedDateWindow } from './dashboard-types';

/**
 * Stage 29 — pure date-window resolution, no I/O. Every boundary is a
 * half-open `[start, end)` UTC ISO range, so a business/postcard record's
 * timestamp comparison is always `ts >= start && ts < end` — never an
 * off-by-one on the final day of a range.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const RELATIVE_PRESET_DAYS: Record<'7d' | '30d' | '90d', number> = { '7d': 7, '30d': 30, '90d': 90 };

function isRelativePreset(preset: DateRangePreset): preset is '7d' | '30d' | '90d' {
  return preset === '7d' || preset === '30d' || preset === '90d';
}

/** `YYYY-MM-DD` only — anything else (missing, malformed, invalid calendar date) returns `null` so the caller can fall back rather than throw. */
function parseDateOnly(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function resolveDateRange(
  filters: Pick<AnalyticsFilters, 'datePreset' | 'customFrom' | 'customTo'>,
  now: Date = new Date(),
): ResolvedDateWindow {
  const nowIso = now.toISOString();

  if (isRelativePreset(filters.datePreset)) {
    const days = RELATIVE_PRESET_DAYS[filters.datePreset];
    const start = new Date(now.getTime() - days * DAY_MS);
    const previousStart = new Date(start.getTime() - days * DAY_MS);
    return {
      start: start.toISOString(),
      end: nowIso,
      previousStart: previousStart.toISOString(),
      previousEnd: start.toISOString(),
      comparisonAvailable: true,
    };
  }

  if (filters.datePreset === 'ytd') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    // No prior-period comparison for YTD — a "same period last year" isn't a
    // clean equal-length window and the spec explicitly allows deferring it.
    return { start: start.toISOString(), end: nowIso, comparisonAvailable: false };
  }

  if (filters.datePreset === 'all') {
    return { start: new Date(0).toISOString(), end: nowIso, comparisonAvailable: false };
  }

  // 'custom' — customTo is the last INCLUDED day, so `end` is that day + 1.
  const start = parseDateOnly(filters.customFrom);
  const endDay = parseDateOnly(filters.customTo);
  if (!start || !endDay || start.getTime() > endDay.getTime()) {
    return resolveDateRange({ datePreset: '30d' }, now); // invalid/missing custom input falls back to the default rather than throwing
  }
  const end = new Date(endDay.getTime() + DAY_MS);
  const durationMs = end.getTime() - start.getTime();

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    previousStart: new Date(start.getTime() - durationMs).toISOString(),
    previousEnd: start.toISOString(),
    comparisonAvailable: true,
  };
}

function isDateRangePreset(value: string): value is DateRangePreset {
  return (DATE_RANGE_PRESETS as readonly string[]).includes(value);
}

function isIndustry(value: string): value is Industry {
  return (INDUSTRIES as readonly string[]).includes(value);
}

function isTemplateVariant(value: string): value is PostcardTemplateVariant {
  return (POSTCARD_TEMPLATE_VARIANTS as readonly string[]).includes(value);
}

/** Missing/unrecognized values are simply omitted (no filter applied) — never throws on a malformed query string. */
export function parseFiltersFromSearchParams(searchParams: Record<string, string | string[] | undefined>): AnalyticsFilters {
  const get = (key: string): string | undefined => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const datePresetRaw = get('datePreset');
  const datePreset = datePresetRaw && isDateRangePreset(datePresetRaw) ? datePresetRaw : '30d';

  const industryRaw = get('industry');
  const templateRaw = get('template');

  return {
    datePreset,
    customFrom: get('customFrom'),
    customTo: get('customTo'),
    industry: industryRaw && isIndustry(industryRaw) ? industryRaw : undefined,
    templateVariant: templateRaw && isTemplateVariant(templateRaw) ? templateRaw : undefined,
    campaignId: get('campaignId') || undefined,
  };
}
