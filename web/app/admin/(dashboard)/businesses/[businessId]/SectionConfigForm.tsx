'use client';
import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { WEBSITE_SECTION_CATALOG } from '@/domain/constants/website-sections';
import type { WebsiteSectionType } from '@/domain/constants/website-sections';
import type { WebsiteSectionConfig } from '@/domain/models/website-sections';
import type { SectionsFormState } from './actions';
import { moveSection } from './section-order';

// Header/footer are pinned to always-first/always-last (page chrome, not
// reorderable content) — these sit outside both the schema's [0, 1000]
// bound's midpoint and the reorderable range below, so they can never
// collide with a computed reorderable order value.
const HEADER_ORDER = 0;
const FOOTER_ORDER = 1000;
const REORDER_STEP = 10;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand text-white px-5 py-2 text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Saving…' : label}
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
  section,
  order,
  unavailable,
  moveButtons,
}: {
  section: WebsiteSectionConfig;
  order: number;
  unavailable: boolean;
  /** Omitted for pinned rows (header/footer) — replaced by an alignment spacer instead. */
  moveButtons?: React.ReactNode;
}) {
  const catalog = WEBSITE_SECTION_CATALOG[section.component];
  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-white">
      <input
        type="checkbox"
        name={`enabled_${section.component}`}
        defaultChecked={section.enabled}
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
      <input type="hidden" name={`order_${section.component}`} value={order} />
      {moveButtons ?? <div className="w-6 shrink-0" />}
    </div>
  );
}

interface Props {
  action: (prevState: SectionsFormState, formData: FormData) => Promise<SectionsFormState>;
  /** Resolved (sanitized/defaulted) current configuration, sorted by order. */
  sections: WebsiteSectionConfig[];
  availability: Record<WebsiteSectionType, boolean>;
  submitLabel?: string;
}

export function SectionConfigForm({ action, sections, availability, submitLabel = 'Save Sections' }: Props) {
  const [state, formAction, isPending] = useActionState<SectionsFormState, FormData>(action, undefined);

  const sectionByType = useMemo(() => new Map(sections.map((s) => [s.component, s])), [sections]);

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

  const header = sectionByType.get('header');
  const footer = sectionByType.get('footer');

  return (
    <form action={formAction} className="space-y-4">
      {state?.message && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
        {/* Header/footer are required, so they're never "enabled but unavailable". */}
        {header && <SectionRow section={header} order={HEADER_ORDER} unavailable={false} />}

        {orderedTypes.map((type, index) => {
          const section = sectionByType.get(type);
          if (!section) return null;
          const catalog = WEBSITE_SECTION_CATALOG[type];
          const unavailable = section.enabled && !catalog.required && !availability[type];
          return (
            <SectionRow
              key={type}
              section={section}
              order={(index + 1) * REORDER_STEP}
              unavailable={unavailable}
              moveButtons={
                <MoveButtons
                  onMoveUp={() => setOrderedTypes((current) => moveSection(current, index, 'up'))}
                  onMoveDown={() => setOrderedTypes((current) => moveSection(current, index, 'down'))}
                  disableUp={index === 0 || isPending}
                  disableDown={index === orderedTypes.length - 1 || isPending}
                />
              }
            />
          );
        })}

        {footer && <SectionRow section={footer} order={FOOTER_ORDER} unavailable={false} />}
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
