'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { INDUSTRIES, type Industry } from '@/domain/constants/industries';
import type { GooglePlaceSearchResult } from '@/domain/models/google-places';
import { searchPlacesAction, type SearchState } from '../../../discover/actions';
import { importSelectedPlacesForCampaignAction, type CampaignDiscoverSelection, type CampaignImportSummary } from './actions';

/**
 * Campaign-scoped Discover — same industry/location search as the
 * standalone Discover page, but selection is lifted into this component
 * (keyed by `placeId`) instead of living inside each search's results form,
 * so picking businesses across multiple searches (different industries or
 * locations) never loses prior picks. See `importSelectedPlacesForCampaignAction`
 * for the combined business-create + campaign-recipient-add step this feeds.
 */

interface SelectionEntry {
  result: GooglePlaceSearchResult;
  industry: Industry | '';
  confirmDuplicate: boolean;
}

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

function SelectionRow({
  result,
  entry,
  onToggle,
  onIndustryChange,
  onConfirmDuplicateChange,
}: {
  result: GooglePlaceSearchResult;
  entry: SelectionEntry | undefined;
  onToggle: () => void;
  onIndustryChange: (industry: Industry | '') => void;
  onConfirmDuplicateChange: (confirm: boolean) => void;
}) {
  const checked = entry !== undefined;
  const industry = entry?.industry ?? result.mappedIndustry ?? '';

  return (
    <tr className="border-b border-gray-100 align-top">
      <td className="py-3 pr-3">
        <input type="checkbox" checked={checked} onChange={onToggle} className="rounded" />
      </td>
      <td className="py-3 pr-3">
        <p className="font-medium text-gray-900">{result.name}</p>
        <p className="text-xs text-gray-400">{result.formattedAddress}</p>
        {result.phone && <p className="text-xs text-gray-400">{result.phone}</p>}
        {result.websiteUrl && (
          <a href={result.websiteUrl} target="_blank" rel="noreferrer" className="text-xs text-(--color-brand) hover:underline">
            {result.websiteUrl}
          </a>
        )}
        <DuplicateNoticeControlled result={result} confirmed={entry?.confirmDuplicate ?? false} onConfirmChange={onConfirmDuplicateChange} />
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
          value={industry}
          onChange={(e) => onIndustryChange(e.target.value as Industry | '')}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
        >
          <option value="">Select…</option>
          {INDUSTRIES.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
        {!industry && <p className="mt-1 text-xs text-amber-700">No confident match — please choose one.</p>}
      </td>
      <td className="py-3 text-xs text-gray-400">{result.businessStatus ?? '—'}</td>
    </tr>
  );
}

/** Controlled variant of `DiscoverPanel.tsx`'s `DuplicateNotice` — reuses its visual layout but toggles lifted selection state instead of an uncontrolled form checkbox. */
function DuplicateNoticeControlled({
  result,
  confirmed,
  onConfirmChange,
}: {
  result: GooglePlaceSearchResult;
  confirmed: boolean;
  onConfirmChange: (confirm: boolean) => void;
}) {
  const blocking = result.duplicateSignals.filter((s) => s.confidence === 'blocking');
  const warnings = result.duplicateSignals.filter((s) => s.confidence === 'warning');

  if (blocking.length === 0 && warnings.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-1">
      {blocking.length > 0 && (
        <div className="rounded-md bg-red-50 border border-red-200 px-2 py-1.5 text-xs text-red-700">
          <p className="font-medium">
            Possible duplicate ({blocking.map((s) => s.type.replace('_', ' ')).join(', ')}) — matches {blocking[0].matchedBusinessName}
          </p>
          <label className="mt-1 flex items-center gap-1.5 font-normal">
            <input type="checkbox" checked={confirmed} onChange={(e) => onConfirmChange(e.target.checked)} className="rounded" />
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

export function CampaignDiscoverPanel({ campaignId }: { campaignId: string }) {
  const [searchState, searchAction] = useActionState<SearchState, FormData>(searchPlacesAction, undefined);
  const [selected, setSelected] = useState<Map<string, SelectionEntry>>(new Map());
  const [showSelected, setShowSelected] = useState(false);
  const [importSummary, setImportSummary] = useState<CampaignImportSummary | null>(null);
  const [isImporting, startImportTransition] = useTransition();

  const results = searchState?.results ?? [];

  function toggleSelection(result: GooglePlaceSearchResult) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(result.placeId)) {
        next.delete(result.placeId);
      } else {
        next.set(result.placeId, { result, industry: result.mappedIndustry ?? '', confirmDuplicate: false });
      }
      return next;
    });
  }

  function updateSelectionIndustry(placeId: string, industry: Industry | '') {
    setSelected((prev) => {
      const entry = prev.get(placeId);
      if (!entry) return prev;
      const next = new Map(prev);
      next.set(placeId, { ...entry, industry });
      return next;
    });
  }

  function updateSelectionConfirmDuplicate(placeId: string, confirmDuplicate: boolean) {
    setSelected((prev) => {
      const entry = prev.get(placeId);
      if (!entry) return prev;
      const next = new Map(prev);
      next.set(placeId, { ...entry, confirmDuplicate });
      return next;
    });
  }

  function handleImport() {
    setImportSummary(null);
    const entries = Array.from(selected.entries());
    const selections: CampaignDiscoverSelection[] = entries
      .filter(([, entry]) => entry.industry)
      .map(([, entry]) => ({ result: entry.result, industry: entry.industry as Industry, confirmDuplicate: entry.confirmDuplicate }));

    startImportTransition(async () => {
      const summary = await importSelectedPlacesForCampaignAction(campaignId, selections);
      setImportSummary(summary);

      // Only clear entries that actually imported — leave failed/duplicate
      // rows checked so the admin can fix and retry them.
      const importedPlaceIds = new Set(
        entries
          .filter(([, entry]) => entry.industry)
          .filter(([, entry]) => !summary.failures.some((f) => f.name === entry.result.name))
          .map(([placeId]) => placeId),
      );
      if (summary.imported > 0) {
        setSelected((prev) => {
          const next = new Map(prev);
          for (const placeId of importedPlaceIds) next.delete(placeId);
          return next;
        });
      }
    });
  }

  const selectedList = Array.from(selected.values());

  return (
    <div className="space-y-6 pb-24">
      {/* Persistent selection summary — visible regardless of which search is on screen. */}
      <div className="sticky top-0 z-10 rounded-xl border border-(--color-border) bg-white p-4 shadow-sm flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {selected.size} {selected.size === 1 ? 'business' : 'businesses'} selected for import
          </p>
          {selected.size > 0 && (
            <button type="button" onClick={() => setShowSelected((v) => !v)} className="text-xs text-(--color-brand) hover:underline">
              {showSelected ? 'Hide list' : 'Show list'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <button type="button" onClick={() => setSelected(new Map())} className="text-xs text-gray-500 hover:underline">
              Clear selection
            </button>
          )}
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting || selected.size === 0}
            className="rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isImporting ? 'Importing…' : `Import ${selected.size || ''} selected`}
          </button>
        </div>
      </div>

      {showSelected && selectedList.length > 0 && (
        <ul className="rounded-xl border border-(--color-border) bg-white p-4 text-sm text-gray-700 space-y-1">
          {selectedList.map((entry) => (
            <li key={entry.result.placeId} className="flex items-center justify-between gap-2">
              <span>
                {entry.result.name} {entry.industry ? <span className="text-gray-400">· {entry.industry}</span> : <span className="text-amber-600">· no industry chosen</span>}
              </span>
              <button type="button" onClick={() => toggleSelection(entry.result)} className="text-xs text-gray-400 hover:text-red-600">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {importSummary && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-900 font-medium">
            Imported {importSummary.imported} · Duplicates skipped {importSummary.duplicates} · Failed {importSummary.failed}
          </p>
          {importSummary.failures.length > 0 && (
            <ul className="mt-2 space-y-1">
              {importSummary.failures.map((f, i) => (
                <li key={`${f.name}-${i}`} className="text-xs text-red-600">
                  {f.name}: {f.reason}
                </li>
              ))}
            </ul>
          )}
          {importSummary.imported > 0 && (
            <p className="mt-3 text-sm">
              <Link href={`/admin/campaigns/${campaignId}`} className="text-(--color-brand) hover:underline">
                Go to campaign →
              </Link>
            </p>
          )}
        </div>
      )}

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

      {searchState?.results && results.length === 0 && !searchState.error && <p className="text-sm text-gray-400">No results for that search.</p>}

      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
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
                {results.map((result) => (
                  <SelectionRow
                    key={result.placeId}
                    result={result}
                    entry={selected.get(result.placeId)}
                    onToggle={() => toggleSelection(result)}
                    onIndustryChange={(industry) => updateSelectionIndustry(result.placeId, industry)}
                    onConfirmDuplicateChange={(confirm) => updateSelectionConfirmDuplicate(result.placeId, confirm)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
