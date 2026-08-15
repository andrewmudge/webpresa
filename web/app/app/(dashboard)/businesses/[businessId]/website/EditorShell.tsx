'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Pencil, Eye } from 'lucide-react';
import { EditorTabNav, TAB_IDS, isTabId, type TabId } from './EditorTabNav';

interface EditorShellProps {
  /** One rendered (server-side) subtree per tab id — see page.tsx. */
  tabs: Record<TabId, React.ReactNode>;
  /** The persistent preview panel's contents (`<WebsitePreviewCard>`). */
  preview: React.ReactNode;
}

/**
 * `window.location.hash` differs between server (no `window` at all) and
 * client, exactly the case `useSyncExternalStore` exists for — it returns
 * `getServerSnapshot()`'s value during hydration's first pass (matching SSR
 * output, no mismatch), then re-renders with the real client value right
 * after. Reading it via a plain `useEffect`+`setState` instead (the
 * previous approach) works but trips this repo's `react-hooks/set-state-in-
 * effect` lint rule; `hashchange` is also a genuine external event to
 * subscribe to (e.g. the browser back/forward buttons), which a one-shot
 * effect wouldn't react to at all. Same technique `DraftChangesNotice.tsx`
 * already uses for its own `localStorage` read.
 */
function getHashSnapshot(): string {
  return window.location.hash.replace('#', '');
}
function getHashServerSnapshot(): string {
  return '';
}
function subscribeToHashChange(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/**
 * The preview-first editor shell (implementation.md, Stage 19.A). Owns only
 * two pieces of UI state — which tab is active, and (mobile-only) whether
 * the customer is looking at the editing panel or the preview panel.
 *
 * Hard requirement, not a convenience: every tab's subtree stays mounted at
 * all times. Switching tabs (or, on mobile, switching to Preview) toggles
 * CSS visibility only — never conditional rendering — because every tab
 * form is a native, uncontrolled `<form>` with no dirty-state tracking.
 * Unmounting the inactive tab on every switch would silently discard
 * whatever the customer had just typed into it. This costs nothing extra:
 * the previous single-column page already mounted and fetched data for all
 * 8 sections simultaneously; this only changes how they're displayed.
 */
export function EditorShell({ tabs, preview }: EditorShellProps) {
  const hash = useSyncExternalStore(subscribeToHashChange, getHashSnapshot, getHashServerSnapshot);
  // Once the customer explicitly picks a tab, that choice wins over the URL
  // hash (which `selectTab` also keeps in sync via `replaceState`, purely
  // for shareable links / a page reload landing back in the right place —
  // `replaceState` deliberately doesn't fire `hashchange`, so it can't
  // fight this local override on every click).
  const [manualTab, setManualTab] = useState<TabId | null>(null);

  // A genuine hash change — a same-page hash link elsewhere on the page
  // (e.g. the Sections tab's "Service Areas" link jumping to `#services`)
  // or the browser back/forward buttons — clears the click-driven override
  // above so `activeTab` falls back to reading the fresh hash below. This
  // listener only ever fires from a *real* hash change: `selectTab` updates
  // the URL via `replaceState`, which deliberately does not dispatch
  // `hashchange` (see its own comment), so a direct tab click never
  // triggers this reset.
  useEffect(() => {
    function handleHashChange() {
      setManualTab(null);
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const activeTab: TabId = manualTab ?? (isTabId(hash) ? hash : 'theme');
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');

  function selectTab(id: TabId) {
    setManualTab(id);
    window.history.replaceState(null, '', `#${id}`);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Spans the full width of the workspace — above both the editing
          panel and the preview panel — rather than being scoped to just the
          left column. */}
      <EditorTabNav activeTab={activeTab} onSelect={selectTab} />

      <div className="lg:hidden flex border-b border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => setMobileView('edit')}
          aria-pressed={mobileView === 'edit'}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            mobileView === 'edit' ? 'border-(--color-brand) text-(--color-brand)' : 'border-transparent text-gray-500'
          }`}
        >
          <Pencil size={14} /> Edit
        </button>
        <button
          type="button"
          onClick={() => setMobileView('preview')}
          aria-pressed={mobileView === 'preview'}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            mobileView === 'preview' ? 'border-(--color-brand) text-(--color-brand)' : 'border-transparent text-gray-500'
          }`}
        >
          <Eye size={14} /> Preview
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <div
          className={`${mobileView === 'edit' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0 lg:w-[440px] lg:shrink-0 lg:border-r lg:border-gray-200 bg-[#F0F4F8] lg:bg-transparent`}
        >
          <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
            {TAB_IDS.map((id) => (
              <div
                key={id}
                id={`tabpanel-${id}`}
                role="tabpanel"
                aria-labelledby={`tab-${id}`}
                hidden={id !== activeTab}
              >
                {tabs[id]}
              </div>
            ))}
          </div>
        </div>

        <div className={`${mobileView === 'preview' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0 flex-1 p-4 sm:p-6 overflow-y-auto`}>
          {preview}
        </div>
      </div>
    </div>
  );
}
