/**
 * Reconstructs an ordered array of objects from `FormData` fields named
 * `${prefix}.${index}.${key}` (see `RepeatableListEditor`, which submits
 * exactly this shape). Indices are assumed contiguous starting at 0 — true
 * for anything `RepeatableListEditor` rendered, since removing an item
 * re-renders the remaining ones at sequential positions.
 */
export function parseIndexedList(formData: FormData, prefix: string, keys: string[]): Record<string, string>[] {
  const items: Record<string, string>[] = [];
  for (let i = 0; ; i += 1) {
    const hasAny = keys.some((key) => formData.has(`${prefix}.${i}.${key}`));
    if (!hasAny) break;
    const item: Record<string, string> = {};
    for (const key of keys) {
      item[key] = ((formData.get(`${prefix}.${i}.${key}`) as string | null) ?? '').trim();
    }
    items.push(item);
  }
  return items;
}
