'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { INDUSTRIES } from '@/domain/constants/industries';
import type { GooglePlaceSearchResult } from '@/domain/models/google-places';
import { searchPlacesAction, importSelectedPlacesAction, type SearchState, type ImportState } from './actions';

function SearchSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Searching…' : 'Search'}
    </button>
  );
}

function ImportSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Importing…' : 'Import selected'}
    </button>
  );
}

function DuplicateNotice({ result, rowIndex }: { result: GooglePlaceSearchResult; rowIndex: number }) {
  const blocking = result.duplicateSignals.filter((s) => s.confidence === 'blocking');
  const warnings = result.duplicateSignals.filter((s) => s.confidence === 'warning');

  if (blocking.length === 0 && warnings.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-1">
      {blocking.length > 0 && (
        <div className="rounded-md bg-red-50 border border-red-200 px-2 py-1.5 text-xs text-red-700">
          <p className="font-medium">
            Possible duplicate ({blocking.map((s) => s.type.replace('_', ' ')).join(', ')}) — matches{' '}
            {blocking[0].matchedBusinessName}
          </p>
          <label className="mt-1 flex items-center gap-1.5 font-normal">
            <input type="checkbox" name={`confirmDuplicate.${rowIndex}`} value="1" className="rounded" />
            Import anyway
          </label>
        </div>
      )}
      {blocking.length === 0 &&
        warnings.map((s) => (
          <p key={s.type} className="text-xs text-amber-700">
            Possible duplicate (same name + city) — matches {s.matchedBusinessName}. Review before importing.
          </p>
        ))}
    </div>
  );
}

function ResultRow({ result, index }: { result: GooglePlaceSearchResult; index: number }) {
  return (
    <tr className="border-b border-gray-100 align-top">
      <td className="py-3 pr-3">
        <input type="checkbox" name={`selected.${index}`} value="1" className="rounded" />
        <input type="hidden" name={`resultData.${index}`} value={JSON.stringify(result)} />
      </td>
      <td className="py-3 pr-3">
        <p className="font-medium text-gray-900">{result.name}</p>
        <p className="text-xs text-gray-400">{result.formattedAddress}</p>
        {result.phone && <p className="text-xs text-gray-400">{result.phone}</p>}
        {result.websiteUrl && (
          <a
            href={result.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-(--color-brand) hover:underline"
          >
            {result.websiteUrl}
          </a>
        )}
        <DuplicateNotice result={result} rowIndex={index} />
      </td>
      <td className="py-3 pr-3 text-sm text-gray-600">
        {result.rating !== undefined ? (
          <span>
            {result.rating.toFixed(1)}★ ({result.userRatingCount ?? 0})
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="py-3 pr-3">
        <select
          name={`industry.${index}`}
          defaultValue={result.mappedIndustry ?? ''}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
        >
          <option value="">Select…</option>
          {INDUSTRIES.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
        {!result.mappedIndustry && (
          <p className="mt-1 text-xs text-amber-700">No confident match — please choose one.</p>
        )}
      </td>
      <td className="py-3 text-xs text-gray-400">{result.businessStatus ?? '—'}</td>
    </tr>
  );
}

export function DiscoverPanel() {
  const [searchState, searchAction] = useActionState<SearchState, FormData>(searchPlacesAction, undefined);
  const [importState, importAction] = useActionState<ImportState, FormData>(
    importSelectedPlacesAction,
    undefined,
  );

  const results = searchState?.results ?? [];

  return (
    <div className="space-y-6">
      <form action={searchAction} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-wrap gap-4 items-end">
        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
            Industry
          </label>
          <select
            id="industry"
            name="industry"
            required
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
          >
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            id="location"
            name="location"
            type="text"
            required
            placeholder="Austin, TX"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
          />
        </div>
        <SearchSubmitButton />
      </form>

      {searchState?.error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {searchState.error}
        </div>
      )}

      {searchState?.results && results.length === 0 && !searchState.error && (
        <p className="text-sm text-gray-400">No results for that search.</p>
      )}

      {results.length > 0 && (
        <form action={importAction} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-200">
                  <th className="py-2 pr-3 w-8"></th>
                  <th className="py-2 pr-3">Business</th>
                  <th className="py-2 pr-3">Rating</th>
                  <th className="py-2 pr-3">Industry</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <ResultRow key={result.placeId} result={result} index={index} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <ImportSubmitButton />
          </div>
        </form>
      )}

      {importState && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-900 font-medium">
            Imported {importState.imported} · Duplicates skipped {importState.duplicates} · Failed{' '}
            {importState.failed}
          </p>
          {importState.failures.length > 0 && (
            <ul className="mt-2 space-y-1">
              {importState.failures.map((f, i) => (
                <li key={`${f.name}-${i}`} className="text-xs text-red-600">
                  {f.name}: {f.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
