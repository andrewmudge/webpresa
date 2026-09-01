import type { AnalyticsFilters } from '@/lib/analytics/dashboard-types';
import {
  VISITOR_RANGE_PRESETS,
  VISITOR_RANGE_PRESET_LABELS,
  type VisitorsFilters,
  type VisitorTrendSeries,
} from '@/lib/analytics/vercel-visitors';
import { formatCount } from './format';

const selectClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent';
const inputClass = selectClass;

const CHART_HEIGHT = 100;
const HOME_COLOR = 'var(--color-brand)';
const BUILD_COLOR = 'var(--color-accent)';

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </p>
      <p className="text-lg font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function buildPolylinePoints(values: number[], max: number): string {
  const n = values.length;
  return values
    .map((value, i) => {
      const x = n === 1 ? 50 : (i / (n - 1)) * 100;
      const y = CHART_HEIGHT - (value / max) * CHART_HEIGHT;
      return `${x},${y}`;
    })
    .join(' ');
}

/**
 * Hand-rolled inline SVG line chart — no chart library is installed
 * anywhere in this repo (see `MrrTrendChart.tsx`'s doc comment), matching
 * this codebase's existing preference for a small hand-rolled UI over a new
 * dependency. Two series (home/build) share one coordinate space so they're
 * visually comparable on a single y-axis.
 */
function VisitorLineChart({ series }: { series: VisitorTrendSeries }) {
  const { points } = series;
  if (points.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
        No visitor data yet. Make sure Web Analytics is enabled for this project in the Vercel dashboard, and check
        back after some real traffic — new page views can take a few minutes to appear.
      </div>
    );
  }

  const maxValue = Math.max(1, ...points.flatMap((p) => [p.home, p.build]));
  const homePolyline = buildPolylinePoints(
    points.map((p) => p.home),
    maxValue,
  );
  const buildPolyline = buildPolylinePoints(
    points.map((p) => p.build),
    maxValue,
  );

  // A label under every point gets unreadable once there are more than a
  // handful (up to ~90 daily points for the 3-month preset) — show only
  // the first, middle, and last labels, matching how a plain sparkline
  // typically handles this rather than crowding every tick.
  const labelIndices = points.length <= 2 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 100 ${CHART_HEIGHT}`} preserveAspectRatio="none" className="w-full h-36" aria-hidden="true">
        <polyline points={buildPolyline} fill="none" stroke={BUILD_COLOR} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <polyline points={homePolyline} fill="none" stroke={HOME_COLOR} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1.5 flex justify-between text-[10px] text-gray-400">
        {labelIndices.map((i) => (
          <span key={i}>{points[i]?.label}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * Independent local date-range control, not the page-wide `FilterBar` —
 * same precedent `PostcardMapCard` already sets for a card whose filter
 * doesn't apply to the rest of the dashboard. Still a plain GET form (no
 * client JS), so its current values are also mirrored as hidden inputs in
 * `FilterBar` and vice versa — see that component's doc comment.
 */
export function WebsiteVisitorsCard({
  series,
  visitorsFilters,
  pageFilters,
}: {
  series: VisitorTrendSeries;
  visitorsFilters: VisitorsFilters;
  pageFilters: AnalyticsFilters;
}) {
  const totalHome = series.points.reduce((sum, p) => sum + p.home, 0);
  const totalBuild = series.points.reduce((sum, p) => sum + p.build, 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Website Visitors</h2>
          <p className="text-xs text-gray-500 mt-0.5">Homepage and /build landing page traffic, via Vercel Web Analytics.</p>
        </div>
        <form method="GET" className="flex items-end gap-2 flex-wrap">
          <input type="hidden" name="datePreset" value={pageFilters.datePreset} />
          <input type="hidden" name="customFrom" value={pageFilters.customFrom ?? ''} />
          <input type="hidden" name="customTo" value={pageFilters.customTo ?? ''} />
          <input type="hidden" name="industry" value={pageFilters.industry ?? ''} />
          <input type="hidden" name="template" value={pageFilters.templateVariant ?? ''} />
          <input type="hidden" name="campaignId" value={pageFilters.campaignId ?? ''} />
          <div>
            <label htmlFor="visitorsRange" className="block text-[10px] font-medium text-gray-500 mb-1">
              Range
            </label>
            <select id="visitorsRange" name="visitorsRange" defaultValue={visitorsFilters.range} className={selectClass}>
              {VISITOR_RANGE_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {VISITOR_RANGE_PRESET_LABELS[preset]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="visitorsFrom" className="block text-[10px] font-medium text-gray-500 mb-1">
              From
            </label>
            <input
              id="visitorsFrom"
              name="visitorsFrom"
              type="date"
              defaultValue={visitorsFilters.customFrom ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="visitorsTo" className="block text-[10px] font-medium text-gray-500 mb-1">
              To
            </label>
            <input id="visitorsTo" name="visitorsTo" type="date" defaultValue={visitorsFilters.customTo ?? ''} className={inputClass} />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-(--color-brand) text-white px-3 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
          >
            Apply
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-xs">
        <MiniStat label="Homepage visitors" value={formatCount(totalHome)} color={HOME_COLOR} />
        <MiniStat label="Build page visitors" value={formatCount(totalBuild)} color={BUILD_COLOR} />
      </div>

      <VisitorLineChart series={series} />
    </div>
  );
}
