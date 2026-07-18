'use client';
import { startTransition, useActionState, useState } from 'react';
import { WEBSITE_SECTION_CATALOG } from '@/domain/constants/website-sections';
import type { WebsiteSectionType } from '@/domain/constants/website-sections';
import type { WebsiteSectionConfig } from '@/domain/models/website-sections';
import type { Business } from '@/domain/models/business';
import type { SitePreview } from '@/domain/models/site-preview';
import type { SectionsFormState } from './actions';
import { moveSection } from './section-order';
import { SectionContentEditor } from './SectionContentEditor';

// Header/footer are pinned to always-first/always-last (page chrome, not
// reorderable content) — these sit outside both the schema's [0, 1000]
// bound's midpoint and the reorderable range below, so they can never
// collide with a computed reorderable order value.
const HEADER_ORDER = 0;
const FOOTER_ORDER = 1000;
const REORDER_STEP = 10;

/** Sections with no content editor at all — no expand chevron shown for these. */
const NO_EDITOR_SECTIONS = new Set<WebsiteSectionType>(['header', 'footer', 'trustStrip', 'reviews']);

function SubmitButton({
  label,
  pending,
  pendingLabel = 'Saving…',
  onClick,
}: {
  label: string;
  pending: boolean;
  pendingLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-lg bg-brand text-white px-5 py-2 text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

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

function ExpandChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
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
  unavailable,
  moveButtons,
  expanded,
  onToggleExpanded,
}: {
  type: WebsiteSectionType;
  enabled: boolean;
  onToggleEnabled: (checked: boolean) => void;
  unavailable: boolean;
  /** Omitted for pinned rows (header/footer) — replaced by an alignment spacer instead. */
  moveButtons?: React.ReactNode;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const catalog = WEBSITE_SECTION_CATALOG[type];
  const hasEditor = !NO_EDITOR_SECTIONS.has(type);

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-white">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onToggleEnabled(e.target.checked)}
        disabled={catalog.required}
        className="rounded border-gray-300 text-(--color-brand) focus:ring-(--color-brand) disabled:opacity-50"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800">{catalog.label}</span>
          {catalog.required && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
              Required
            </span>
          )}
        </div>
        {unavailable && (
          <p className="text-xs text-amber-600 mt-0.5">
            Enabled, but hidden on the public preview — no content available yet.
          </p>
        )}
      </div>
      {hasEditor ? (
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          className="p-1 rounded text-gray-800 hover:text-black hover:bg-gray-100 transition-colors"
        >
          <ExpandChevron open={expanded} />
        </button>
      ) : (
        <div className="w-6 shrink-0" />
      )}
      {moveButtons ?? <div className="w-6 shrink-0" />}
    </div>
  );
}

interface Props {
  action: (prevState: SectionsFormState, formData: FormData) => Promise<SectionsFormState>;
  /**
   * Auto-save variant (no redirect) — when provided, every checkbox toggle
   * and reorder click persists immediately and the manual "Save Sections"
   * button is replaced with a small saved/saving status instead. Omit for
   * contexts that want an explicit, deliberate save step (the onboarding
   * wizard's "Finish setup" — see `action` above).
   */
  autoSaveAction?: (prevState: SectionsFormState, formData: FormData) => Promise<SectionsFormState>;
  /** Resolved (sanitized/defaulted) current configuration, sorted by order. */
  sections: WebsiteSectionConfig[];
  availability: Record<WebsiteSectionType, boolean>;
  submitLabel?: string;
  /** Shown on the manual submit button while its action is pending — e.g. "Generating…" for the wizard's AI-triggering finish step. */
  pendingLabel?: string;
  business: Business;
  /** The business's most recent preview, if one has been generated. */
  latestPreview?: SitePreview;
  redirectTo: string;
  /** Section to render already-expanded on mount — set after a content save redirects back here. */
  initialExpandedSection?: WebsiteSectionType;
}

export function SectionConfigForm({
  action,
  autoSaveAction,
  sections,
  availability,
  submitLabel = 'Save Sections',
  pendingLabel,
  business,
  latestPreview,
  redirectTo,
  initialExpandedSection,
}: Props) {
  // In auto-save mode, every interaction dispatches through the same
  // bound action (autoSaveAction) instead of requiring a separate manual
  // "Save Sections" click — see the Props doc comment above.
  const [state, formAction, isPending] = useActionState<SectionsFormState, FormData>(autoSaveAction ?? action, undefined);

  // Only the 13 reorderable identifiers live in client state — header/footer
  // are pinned (see HEADER_ORDER/FOOTER_ORDER). Defensively sorted by the
  // incoming `order` first: callers are expected to already sort, but this
  // guards against ever silently misordering the first-time onboarding view.
  const [orderedTypes, setOrderedTypes] = useState<WebsiteSectionType[]>(() =>
    [...sections]
      .sort((a, b) => a.order - b.order)
      .map((s) => s.component)
      .filter((type) => type !== 'header' && type !== 'footer'),
  );

  const [enabledByType, setEnabledByType] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((s) => [s.component, s.enabled])),
  );

  const [expandedTypes, setExpandedTypes] = useState<Set<WebsiteSectionType>>(
    () => new Set(initialExpandedSection ? [initialExpandedSection] : []),
  );

  function toggleExpanded(type: WebsiteSectionType) {
    setExpandedTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

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
    // useActionState's dispatch must be invoked inside a transition when
    // called imperatively (not via a <form>'s action prop) — otherwise React
    // warns and doesn't track pending state correctly, which previously
    // manifested as the save silently not taking effect and a "Rendered more
    // hooks than during the previous render" crash on the following render.
    startTransition(() => {
      formAction(formData);
    });
  }

  function handleSave() {
    persist(orderedTypes, enabledByType);
  }

  // `persist` (and therefore `formAction`/`startTransition`) must never be
  // called from inside a `setState` updater function — updaters run during
  // React's render/commit work and must stay pure, and dispatching another
  // action from within one throws "Cannot update action state while
  // rendering." The buttons that trigger these handlers are already
  // disabled while `isPending`, so there's no concurrent-call risk in
  // reading `orderedTypes`/`enabledByType` directly here instead of via the
  // functional-updater form.
  function handleToggleEnabled(type: WebsiteSectionType, checked: boolean) {
    const next = { ...enabledByType, [type]: checked };
    setEnabledByType(next);
    if (autoSaveAction) persist(orderedTypes, next);
  }

  function handleMove(index: number, direction: 'up' | 'down') {
    const next = moveSection(orderedTypes, index, direction);
    setOrderedTypes(next);
    if (autoSaveAction) persist(next, enabledByType);
  }

  return (
    <div className="space-y-4">
      {state?.message && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
        {/* Header — required, so it's never "enabled but unavailable". */}
        <div>
          <SectionRow
            type="header"
            enabled
            onToggleEnabled={() => {}}
            unavailable={false}
            expanded={expandedTypes.has('header')}
            onToggleExpanded={() => toggleExpanded('header')}
          />
        </div>

        {orderedTypes.map((type, index) => {
          const catalog = WEBSITE_SECTION_CATALOG[type];
          const enabled = catalog.required || !!enabledByType[type];
          const unavailable = enabled && !catalog.required && !availability[type];
          const expanded = expandedTypes.has(type);
          return (
            <div key={type}>
              <SectionRow
                type={type}
                enabled={enabled}
                onToggleEnabled={(checked) => handleToggleEnabled(type, checked)}
                unavailable={unavailable}
                expanded={expanded}
                onToggleExpanded={() => toggleExpanded(type)}
                moveButtons={
                  <MoveButtons
                    onMoveUp={() => handleMove(index, 'up')}
                    onMoveDown={() => handleMove(index, 'down')}
                    disableUp={index === 0 || isPending}
                    disableDown={index === orderedTypes.length - 1 || isPending}
                  />
                }
              />
              {expanded && (
                <div className="border-t border-gray-100 bg-gray-50/60">
                  <SectionContentEditor section={type} business={business} preview={latestPreview} redirectTo={redirectTo} />
                </div>
              )}
            </div>
          );
        })}

        {/* Footer — required, so it's never "enabled but unavailable". */}
        <div>
          <SectionRow
            type="footer"
            enabled
            onToggleEnabled={() => {}}
            unavailable={false}
            expanded={expandedTypes.has('footer')}
            onToggleExpanded={() => toggleExpanded('footer')}
          />
        </div>
      </div>

      {autoSaveAction ? (
        <p className="text-xs text-gray-400">{isPending ? 'Saving…' : 'Changes save automatically.'}</p>
      ) : (
        <SubmitButton label={submitLabel} pending={isPending} pendingLabel={pendingLabel} onClick={handleSave} />
      )}
    </div>
  );
}
