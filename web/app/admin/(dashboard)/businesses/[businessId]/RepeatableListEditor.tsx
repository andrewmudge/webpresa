'use client';

import { useState } from 'react';

interface FieldSpec {
  key: string;
  label: string;
  multiline?: boolean;
  maxLength?: number;
  /** Renders a `<select>` instead of a text input/textarea, or a bare
   *  `<input type="hidden">` with no visible label/wrapper at all — used to
   *  round-trip an item's stable identity (e.g. testimonials' `id`) through
   *  a save without the admin ever seeing or editing it. */
  type?: 'select' | 'hidden';
  options?: { value: string; label: string }[];
}

interface Item {
  id: number;
  values: Record<string, string>;
}

let idCounter = 0;
function nextId(): number {
  idCounter += 1;
  return idCounter;
}

interface Props {
  /** Form field name prefix — submitted as `${name}.${position}.${field.key}` per item, in current order. */
  name: string;
  fields: FieldSpec[];
  defaultItems: Record<string, string>[];
  addLabel?: string;
  maxItems?: number;
  emptyLabel?: string;
}

/**
 * Add/remove/reorder editor for a list of same-shaped objects (services,
 * differentiators, testimonials, FAQ items, process steps, service areas).
 * Items are uncontrolled inputs keyed by a stable client-side id so
 * reordering moves the actual DOM node (and its current, possibly-unsaved
 * value) instead of remounting it. Submitted field names encode the
 * current position (`name.0.key`, `name.1.key`, ...) so the server action
 * can reconstruct the array in order without needing item identity.
 */
export function RepeatableListEditor({
  name,
  fields,
  defaultItems,
  addLabel = 'Add',
  maxItems = 20,
  emptyLabel = 'No items yet.',
}: Props) {
  const [items, setItems] = useState<Item[]>(() => defaultItems.map((values) => ({ id: nextId(), values })));

  function addItem() {
    setItems((current) => (current.length >= maxItems ? current : [...current, { id: nextId(), values: {} }]));
  }
  function removeItem(id: number) {
    setItems((current) => current.filter((it) => it.id !== id));
  }
  function moveItem(id: number, direction: 'up' | 'down') {
    setItems((current) => {
      const index = current.findIndex((it) => it.id === id);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="text-xs text-gray-400 italic">{emptyLabel}</p>}
      {items.map((item, position) => (
        <div key={item.id} className="rounded-lg border border-gray-200 p-3 flex gap-3">
          <div className="flex-1 space-y-2">
            {fields.map((field) => {
              if (field.type === 'hidden') {
                return (
                  <input
                    key={field.key}
                    type="hidden"
                    name={`${name}.${position}.${field.key}`}
                    defaultValue={item.values[field.key] ?? ''}
                  />
                );
              }
              return (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      name={`${name}.${position}.${field.key}`}
                      defaultValue={item.values[field.key] ?? ''}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
                    >
                      {(field.options ?? []).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.multiline ? (
                    <textarea
                      name={`${name}.${position}.${field.key}`}
                      defaultValue={item.values[field.key] ?? ''}
                      maxLength={field.maxLength}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
                    />
                  ) : (
                    <input
                      type="text"
                      name={`${name}.${position}.${field.key}`}
                      defaultValue={item.values[field.key] ?? ''}
                      maxLength={field.maxLength}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button
              type="button"
              onClick={() => moveItem(item.id, 'up')}
              disabled={position === 0}
              aria-label="Move up"
              className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveItem(item.id, 'down')}
              disabled={position === items.length - 1}
              aria-label="Move down"
              className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              aria-label="Remove"
              className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        disabled={items.length >= maxItems}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {addLabel}
      </button>
    </div>
  );
}
