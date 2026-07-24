import Link from 'next/link';
import { BUSINESS_SOURCES, BUSINESS_STATUSES } from '@/domain/models/business';
import { INDUSTRIES } from '@/domain/constants/industries';
import { QUALIFICATION_RESULTS } from '@/domain/models/website-assessment';
import { QUALIFICATION_LABELS } from '@/lib/scoring/labels';

export interface BusinessFilterValues {
  status?: string;
  industry?: string;
  source?: string;
  city?: string;
  state?: string;
  createdFrom?: string;
  createdTo?: string;
  qualification?: string;
}

const selectClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent';
const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent';

function FilterSelect({
  label,
  name,
  options,
  allLabel,
  defaultValue,
  formatLabel = (opt) => opt.replace(/_/g, ' '),
}: {
  label: string;
  name: string;
  options: readonly string[];
  allLabel: string;
  defaultValue?: string;
  /** Defaults to the raw option with underscores replaced — pass a lookup for nicer casing (e.g. qualification's "Manual Review", matching the badge shown elsewhere). */
  formatLabel?: (opt: string) => string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-gray-500 mb-1">
        {label}
      </label>
      <select id={name} name={name} defaultValue={defaultValue ?? ''} className={selectClass}>
        <option value="">{allLabel}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {formatLabel(opt)}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterInput({
  label,
  name,
  type = 'text',
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-gray-500 mb-1">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ''}
        className={inputClass}
      />
    </div>
  );
}

/**
 * Plain GET form — filters live entirely in the URL (`searchParams`), so no
 * client JS is needed: submitting navigates to `/admin/businesses?status=...`
 * and the server component re-queries `listBusinesses` with the new filters.
 * Changing filters intentionally has no `cursor` field, so it always resets
 * pagination back to the first page.
 */
export function FilterBar({ values, hasActiveFilters }: { values: BusinessFilterValues; hasActiveFilters: boolean }) {
  return (
    <form method="GET" className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <FilterSelect label="Status" name="status" options={BUSINESS_STATUSES} allLabel="All statuses" defaultValue={values.status} />
        <FilterSelect label="Industry" name="industry" options={INDUSTRIES} allLabel="All industries" defaultValue={values.industry} />
        <FilterSelect label="Source" name="source" options={BUSINESS_SOURCES} allLabel="All sources" defaultValue={values.source} />
        <FilterSelect
          label="Qualification"
          name="qualification"
          options={QUALIFICATION_RESULTS}
          allLabel="All qualifications"
          defaultValue={values.qualification}
          formatLabel={(opt) => QUALIFICATION_LABELS[opt as (typeof QUALIFICATION_RESULTS)[number]]}
        />
        <FilterInput label="City" name="city" placeholder="Austin" defaultValue={values.city} />
        <FilterInput label="State" name="state" placeholder="TX" defaultValue={values.state} />
        <FilterInput label="Created from" name="createdFrom" type="date" defaultValue={values.createdFrom} />
        <FilterInput label="Created to" name="createdTo" type="date" defaultValue={values.createdTo} />
      </div>
      <div className="flex items-center gap-3 mt-3">
        <button
          type="submit"
          className="rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
        >
          Apply filters
        </button>
        {hasActiveFilters && (
          <Link href="/admin/businesses" className="text-sm text-gray-500 hover:text-gray-700 hover:underline">
            Clear filters
          </Link>
        )}
      </div>
    </form>
  );
}
