'use client';

import { useRef } from 'react';

/**
 * The 8 editor categories, unchanged from the prior anchor-scroll page (see
 * implementation.md, Stage 19.A, "Information architecture decision" — kept
 * as-is deliberately, not regrouped). Every existing Server Action redirect
 * target (`actions.ts`'s `SECTION_ANCHOR` map) already targets one of these
 * exact ids, so keeping the id set identical means zero action changes.
 */
export const TAB_IDS = ['theme', 'logo', 'sections', 'content', 'services', 'photos', 'contact', 'seo'] as const;
export type TabId = (typeof TAB_IDS)[number];

const TAB_LABELS: Record<TabId, string> = {
  theme: 'Theme',
  logo: 'Logo',
  sections: 'Sections',
  content: 'Content',
  services: 'Services',
  photos: 'Photos',
  contact: 'Contact & CTAs',
  seo: 'SEO',
};

export function isTabId(value: string): value is TabId {
  return (TAB_IDS as readonly string[]).includes(value);
}

interface EditorTabNavProps {
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
}

/**
 * Real ARIA tablist semantics (role="tablist"/"tab", aria-selected,
 * aria-controls, roving tabindex, arrow-key navigation) — the anchor bar
 * this replaces had none of this (implementation.md, Stage 19.A,
 * "Accessibility"). Home/End jump to the first/last tab; Left/Right move
 * one at a time and wrap around, matching the standard WAI-ARIA tabs
 * pattern.
 */
export function EditorTabNav({ activeTab, onSelect }: EditorTabNavProps) {
  const buttonRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  function focusAndSelect(id: TabId) {
    onSelect(id);
    buttonRefs.current[id]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TAB_IDS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TAB_IDS.length) % TAB_IDS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = TAB_IDS.length - 1;
    if (nextIndex !== null) {
      event.preventDefault();
      focusAndSelect(TAB_IDS[nextIndex]);
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Website editor sections"
      className="flex gap-1 overflow-x-auto bg-white border-b border-gray-200 px-2 sticky top-0 z-10"
    >
      {TAB_IDS.map((id, index) => {
        const selected = activeTab === id;
        return (
          <button
            key={id}
            ref={(el) => {
              buttonRefs.current[id] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={selected}
            aria-controls={`tabpanel-${id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`shrink-0 px-4 py-3 text-sm font-semibold border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand) focus-visible:ring-offset-1 rounded-t-md ${
              selected
                ? 'border-(--color-brand) text-(--color-brand)'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {TAB_LABELS[id]}
          </button>
        );
      })}
    </div>
  );
}
