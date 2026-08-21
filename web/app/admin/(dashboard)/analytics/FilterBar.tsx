import { DATE_RANGE_PRESETS, DATE_RANGE_PRESET_LABELS } from '@/lib/analytics/dashboard-types';
import type { AnalyticsFilters, AnalyticsFilterOptions } from '@/lib/analytics/dashboard-types';
import { formatTemplateLabel } from './format';

const selectClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent';
const inputClass = selectClass;

/**
 * Plain GET form, mirroring `businesses/FilterBar.tsx` exactly — filters
 * live entirely in the URL, so no client JS is needed. `filterOptions` is
 * `undefined` only when the initial data load itself failed (the page's
 * error banner is shown separately) — every select still renders with
 * whatever values are already in the URL so filtering can be retried.
 */
export function FilterBar({ filters, filterOptions }: { filters: AnalyticsFilters; filterOptions?: AnalyticsFilterOptions }) {
  return (
    <form method="GET" className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div>
          <label htmlFor="datePreset" className="block text-xs font-medium text-gray-500 mb-1">
            Date range
          </label>
          <select id="datePreset" name="datePreset" defaultValue={filters.datePreset} className={selectClass}>
            {DATE_RANGE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {DATE_RANGE_PRESET_LABELS[preset]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="customFrom" className="block text-xs font-medium text-gray-500 mb-1">
            Custom from
          </label>
          <input id="customFrom" name="customFrom" type="date" defaultValue={filters.customFrom ?? ''} className={inputClass} />
        </div>
        <div>
          <label htmlFor="customTo" className="block text-xs font-medium text-gray-500 mb-1">
            Custom to
          </label>
          <input id="customTo" name="customTo" type="date" defaultValue={filters.customTo ?? ''} className={inputClass} />
        </div>
        <div>
          <label htmlFor="industry" className="block text-xs font-medium text-gray-500 mb-1">
            Industry
          </label>
          <select id="industry" name="industry" defaultValue={filters.industry ?? ''} className={selectClass}>
            <option value="">All industries</option>
            {(filterOptions?.industries ?? []).map((industry) => (
              <option key={industry} value={industry}>
                {formatTemplateLabel(industry)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="template" className="block text-xs font-medium text-gray-500 mb-1">
            Postcard template
          </label>
          <select id="template" name="template" defaultValue={filters.templateVariant ?? ''} className={selectClass}>
            <option value="">All templates</option>
            {(filterOptions?.templates ?? []).map((template) => (
              <option key={template} value={template}>
                {formatTemplateLabel(template)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="campaignId" className="block text-xs font-medium text-gray-500 mb-1">
            Campaign
          </label>
          <select id="campaignId" name="campaignId" defaultValue={filters.campaignId ?? ''} className={selectClass}>
            <option value="">All campaigns</option>
            {(filterOptions?.campaigns ?? []).map((campaign) => (
              <option key={campaign.campaignId} value={campaign.campaignId}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <button
          type="submit"
          className="rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
        >
          Apply filters
        </button>
      </div>
    </form>
  );
}
