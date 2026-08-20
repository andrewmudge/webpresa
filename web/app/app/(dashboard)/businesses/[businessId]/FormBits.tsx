'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';

/** Small shared form primitives reused across every customer editor tab. */

export function TextField({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  disabled,
  maxLength,
  type = 'text',
  autoComplete,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-(--color-border) px-3 py-2 text-base sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) disabled:bg-gray-50 disabled:text-gray-400"
      />
    </label>
  );
}

/**
 * A single-line `TextField` that can be expanded into a multi-line
 * `textarea` for fields whose text often overflows a single line (e.g.
 * service descriptions) — the box stays compact by default, but every
 * field gets the same expand affordance rather than only the ones that
 * happen to overflow, so behavior is predictable. Only one of the two
 * underlying elements is ever mounted at a time (both share one `name` and
 * one controlled value), so toggling never loses what's been typed and
 * never double-submits the field.
 */
export function ExpandableTextField({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  disabled,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState(defaultValue ?? '');
  const fieldClassName =
    'w-full rounded-lg border border-(--color-border) px-3 py-2 text-base sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) disabled:bg-gray-50 disabled:text-gray-400';

  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          disabled={disabled}
          className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-gray-400 hover:text-(--color-brand) disabled:opacity-50"
        >
          {expanded ? 'Collapse' : 'Expand'}
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>
      {expanded ? (
        <textarea
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          rows={4}
          className={fieldClassName}
        />
      ) : (
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          className={fieldClassName}
        />
      )}
    </label>
  );
}

export function TextAreaField({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  disabled,
  rows = 3,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className="w-full rounded-lg border border-(--color-border) px-3 py-2 text-base sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) disabled:bg-gray-50 disabled:text-gray-400"
      />
    </label>
  );
}

const SAVE_BUTTON_VARIANT_CLASSES = {
  primary: 'bg-(--color-brand) text-white hover:bg-(--color-brand-dark)',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
} as const;

export function SaveButton({
  label = 'Save',
  pendingLabel = 'Saving…',
  disabled,
  icon,
  variant = 'primary',
  fullWidthOnMobile,
}: {
  label?: string;
  /** Shown in place of `label` while the form submission is pending. */
  pendingLabel?: string;
  disabled?: boolean;
  /** A pre-rendered icon element (e.g. `<ExternalLink size={16} />`) shown
   *  after the label — must be an element, not a component reference, since
   *  this is a Client Component that a Server Component page renders. */
  icon?: React.ReactNode;
  variant?: keyof typeof SAVE_BUTTON_VARIANT_CLASSES;
  fullWidthOnMobile?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${SAVE_BUTTON_VARIANT_CLASSES[variant]} ${fullWidthOnMobile ? 'w-full sm:w-auto' : ''}`}
    >
      {pending ? pendingLabel : label}
      {!pending && icon}
    </button>
  );
}

const BADGE_TONE_CLASSES = {
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  gray: 'bg-gray-100 text-gray-600',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-800',
} as const;

export type BadgeTone = keyof typeof BADGE_TONE_CLASSES;

/** Small status pill — reuses the color pairings already used ad hoc across the dashboard (see e.g. `businesses/[businessId]/page.tsx`'s `STATUS_BADGE`). */
export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${BADGE_TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}
