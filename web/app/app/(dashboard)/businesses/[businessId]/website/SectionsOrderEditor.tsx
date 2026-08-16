'use client';

import { startTransition, useActionState, useState } from 'react';
import Link from 'next/link';
import { WEBSITE_SECTION_CATALOG } from '@/domain/constants/website-sections';
import type { WebsiteSectionType } from '@/domain/constants/website-sections';
import type { WebsiteSectionConfig } from '@/domain/models/website-sections';
import { moveSection } from '@/lib/forms/reorder';
import { autoSaveSectionsActionCustomer } from '../actions';

/**
 * Where each section's title actually links to, when it has a genuine
 * editable home elsewhere on the dashboard. Sections with no dedicated
 * editor today (page chrome like `header`/`footer`/`trustStrip`) are
 * intentionally omitted rather than linking to a dead end. `reviews`
 * (Google review hide/show), `faq`, and `process` all link to `#content` —
 * their editors live inline in `ContentTab.tsx`, alongside Hero/About.
 * `ctaBanner` links to `#contact`, where its heading/sub-headline editor
 * lives alongside the CTA button editor in `ContactTab.tsx`.
 */
function getSectionHref(type: WebsiteSectionType, businessId: string): string | undefined {
  switch (type) {
    case 'hero':
    case 'about':
    case 'reviews':
    case 'faq':
    case 'process':
      return '#content';
    case 'services':
    case 'whyChooseUs':
    case 'serviceAreas':
      return '#services';
    case 'gallery':
      return '#photos';
    case 'contact':
    case 'ctaBanner':
      return '#contact';
    case 'socialLinks':
      return `/app/businesses/${businessId}/settings`;
    default:
      return undefined;
  }
}

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

/**
 * `getSectionHref` returns either a same-page hash (jump to another tab on
 * this same page) or a real route (`socialLinks` → the Settings page).
 * These need different tags: `next/link` navigates same-page hash targets
 * via `history.pushState`, which — unlike a plain anchor click or setting
 * `location.hash` directly — does not fire a native `hashchange` event
 * (documented browser behavior), and `EditorShell`'s tab switch is driven
 * entirely by that event. A plain `<a>` performs real browser hash
 * navigation, which does fire it. Non-hash hrefs still go through `Link`
 * for normal client-side route transitions.
 */
function SectionTitleLink({ href, children }: { href: string; children: React.ReactNode }) {
  const className =
    'text-sm font-medium text-gray-900 underline decoration-gray-400 underline-offset-2 hover:decoration-gray-900 transition-colors';
  if (href.startsWith('#')) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function SectionRow({
  type,
  href,
  enabled,
  onToggleEnabled,
  disabled,
  moveButtons,
}: {
  type: WebsiteSectionType;
  /** When present, the title links to that section's actual editor — see `getSectionHref`. */
  href?: string;
  enabled: boolean;
  onToggleEnabled: (checked: boolean) => void;
  disabled: boolean;
  /** Omitted for pinned rows (header/footer) — replaced by an alignment spacer instead. */
  moveButtons?: React.ReactNode;
}) {
  const catalog = WEBSITE_SECTION_CATALOG[type];
  return (
    <div className="flex items-start gap-3 px-3 py-3 bg-white">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onToggleEnabled(e.target.checked)}
        disabled={catalog.required || disabled}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-(--color-brand) focus:ring-(--color-brand) disabled:opacity-50"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {href ? (
            <SectionTitleLink href={href}>{catalog.label}</SectionTitleLink>
          ) : (
            <span className="text-sm font-medium text-gray-800">{catalog.label}</span>
          )}
          {catalog.required && <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">Required</span>}
        </div>
        <p className="mt-0.5 text-xs text-gray-400 leading-snug">{catalog.description}</p>
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
              href={getSectionHref(type, businessId)}
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
