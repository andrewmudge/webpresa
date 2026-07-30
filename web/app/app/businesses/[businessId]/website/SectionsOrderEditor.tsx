'use client';

import { startTransition, useActionState, useState } from 'react';
import { WEBSITE_SECTION_CATALOG } from '@/domain/constants/website-sections';
import type { WebsiteSectionType } from '@/domain/constants/website-sections';
import type { WebsiteSectionConfig } from '@/domain/models/website-sections';
import { moveSection } from '@/lib/forms/reorder';
import { autoSaveSectionsActionCustomer } from '../actions';

/**
 * Customer-scoped counterpart to the admin's `SectionConfigForm.tsx` up/down
 * reorder controls — same pinned-header/footer + `moveSection()` + auto-save
 * pattern, just without the inline per-section content editor (the customer
 * dashboard already has that content in its own Content/Services/Photos/
 * Contact/SEO sections, so there's nothing to expand here).
 */
const HEADER_ORDER = 0;
const FOOTER_ORDER = 1000;
const REORDER_STEP = 10;

function ChevronUpIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function MoveButtons({
  onMoveUp,
  onMoveDown,
  disableUp,
  disableDown,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableUp: boolean;
  disableDown: boolean;
}) {
  return (
    <div className="flex flex-col shrink-0 w-6">
      <button
        type="button"
        onClick={onMoveUp}
        disabled={disableUp}
        aria-label="Move up"
        className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
      >
        <ChevronUpIcon />
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={disableDown}
        aria-label="Move down"
        className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
      >
        <ChevronDownIcon />
      </button>
    </div>
  );
}

function SectionRow({
  type,
  enabled,
  onToggleEnabled,
  disabled,
  moveButtons,
}: {
  type: WebsiteSectionType;
  enabled: boolean;
  onToggleEnabled: (checked: boolean) => void;
  disabled: boolean;
  /** Omitted for pinned rows (header/footer) — replaced by an alignment spacer instead. */
  moveButtons?: React.ReactNode;
}) {
  const catalog = WEBSITE_SECTION_CATALOG[type];
  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-white">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onToggleEnabled(e.target.checked)}
        disabled={catalog.required || disabled}
        className="h-4 w-4 rounded border-gray-300 text-(--color-brand) focus:ring-(--color-brand) disabled:opacity-50"
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-800">{catalog.label}</span>
        {catalog.required && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">Required</span>}
      </div>
      {moveButtons ?? <div className="w-6 shrink-0" />}
    </div>
  );
}

interface Props {
  businessId: string;
  sections: WebsiteSectionConfig[];
  isReadOnly: boolean;
}

export function SectionsOrderEditor({ businessId, sections, isReadOnly }: Props) {
  const [state, formAction, isPending] = useActionState(autoSaveSectionsActionCustomer.bind(null, businessId), undefined);

  // Only the reorderable identifiers (every catalog entry except header/
  // footer, which are pinned first/last — page chrome, not reorderable
  // content) live in client state.
  const [orderedTypes, setOrderedTypes] = useState<WebsiteSectionType[]>(() =>
    [...sections]
      .sort((a, b) => a.order - b.order)
      .map((s) => s.component)
      .filter((type) => type !== 'header' && type !== 'footer'),
  );
  const [enabledByType, setEnabledByType] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((s) => [s.component, s.enabled])),
  );

  function persist(nextOrderedTypes: WebsiteSectionType[], nextEnabledByType: Record<string, boolean>) {
    const formData = new FormData();
    formData.set('enabled_header', 'on');
    formData.set('order_header', String(HEADER_ORDER));
    nextOrderedTypes.forEach((type, index) => {
      const catalog = WEBSITE_SECTION_CATALOG[type];
      if (catalog.required || nextEnabledByType[type]) {
        formData.set(`enabled_${type}`, 'on');
      }
      formData.set(`order_${type}`, String((index + 1) * REORDER_STEP));
    });
    formData.set('enabled_footer', 'on');
    formData.set('order_footer', String(FOOTER_ORDER));
    // Dispatching useActionState's action imperatively (not via a <form>'s
    // action prop) must happen inside a transition — see the identical note
    // in the admin's SectionConfigForm.tsx.
    startTransition(() => {
      formAction(formData);
    });
  }

  function handleToggleEnabled(type: WebsiteSectionType, checked: boolean) {
    const next = { ...enabledByType, [type]: checked };
    setEnabledByType(next);
    if (!isReadOnly) persist(orderedTypes, next);
  }

  function handleMove(index: number, direction: 'up' | 'down') {
    const next = moveSection(orderedTypes, index, direction);
    setOrderedTypes(next);
    if (!isReadOnly) persist(next, enabledByType);
  }

  return (
    <div className="space-y-2">
      {state?.message && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
        <SectionRow type="header" enabled onToggleEnabled={() => {}} disabled />

        {orderedTypes.map((type, index) => {
          const catalog = WEBSITE_SECTION_CATALOG[type];
          const enabled = catalog.required || !!enabledByType[type];
          return (
            <SectionRow
              key={type}
              type={type}
              enabled={enabled}
              onToggleEnabled={(checked) => handleToggleEnabled(type, checked)}
              disabled={isReadOnly}
              moveButtons={
                <MoveButtons
                  onMoveUp={() => handleMove(index, 'up')}
                  onMoveDown={() => handleMove(index, 'down')}
                  disableUp={index === 0 || isPending || isReadOnly}
                  disableDown={index === orderedTypes.length - 1 || isPending || isReadOnly}
                />
              }
            />
          );
        })}

        <SectionRow type="footer" enabled onToggleEnabled={() => {}} disabled />
      </div>

      <p className="text-xs text-gray-400">{isPending ? 'Saving…' : 'Changes save automatically.'}</p>
    </div>
  );
}
