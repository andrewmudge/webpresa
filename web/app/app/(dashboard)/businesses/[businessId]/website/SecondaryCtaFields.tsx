'use client';

import { useState } from 'react';
import { CTA_ACTION_TYPES, type CtaActionType } from '@/domain/models/site-preview';
import { TextField } from '../FormBits';
import { CTA_TYPE_LABELS } from './cta-type-labels';

interface Props {
  defaultChecked: boolean;
  defaultType: CtaActionType;
  defaultLabel: string;
  defaultValue?: string;
  disabled: boolean;
}

/**
 * A CSS-only (`group-has-[:checked]:block`) version of this previously hid
 * the fields visually but the toggle didn't reliably control it in the real
 * build — a plain client component with actual state is the reliable fix,
 * at the cost of a little JS. The checkbox stays an uncontrolled form field
 * (`defaultChecked`, not `checked`) so `secondaryEnabled` still submits
 * normally with the rest of the (server-rendered) form in `ContactTab.tsx`;
 * `onChange` only drives which fields render, it never touches form state.
 */
export function SecondaryCtaFields({ defaultChecked, defaultType, defaultLabel, defaultValue, disabled }: Props) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          name="secondaryEnabled"
          defaultChecked={defaultChecked}
          onChange={(e) => setChecked(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-gray-300 text-(--color-brand)"
        />
        Show a secondary button
      </label>
      {checked && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">Action</span>
              <select
                name="secondaryType"
                defaultValue={defaultType}
                disabled={disabled}
                className="w-full rounded-lg border border-(--color-border) px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
              >
                {CTA_ACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CTA_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <TextField label="Button label" name="secondaryLabel" defaultValue={defaultLabel} disabled={disabled} maxLength={40} />
          </div>
          <TextField label="Destination (link, if applicable)" name="secondaryValue" defaultValue={defaultValue} disabled={disabled} placeholder="https://…" />
        </div>
      )}
    </>
  );
}
