/**
 * Pure list-reorder helper for up/down arrow buttons in a section-order
 * editor. Framework-free and generic so it's unit-testable without
 * rendering a component — this repo's vitest config runs in a plain `node`
 * environment (no jsdom/RTL), so component-level reorder logic can't be
 * tested directly.
 *
 * Moved to a neutral `lib/` location (Stage 19) — originally private to the
 * admin `SectionConfigForm.tsx`, now shared with the customer-scoped
 * Sections tab under `app/app/businesses/[businessId]/website/`.
 */
export function moveSection<T>(list: readonly T[], index: number, direction: 'up' | 'down'): T[] {
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) {
    return [...list];
  }
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
