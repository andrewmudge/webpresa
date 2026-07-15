/**
 * Pure list-reorder helper for the Website Sections admin UI's up/down
 * arrow buttons. Framework-free and generic so it's unit-testable without
 * rendering `SectionConfigForm.tsx` — this repo's vitest config runs in a
 * plain `node` environment (no jsdom/RTL), so component-level reorder logic
 * can't be tested directly.
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
